//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IGisToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract GisBridge is AccessControl {
    bytes32 public constant CHAIN_MANAGER_ROLE = keccak256("CHAIN_MANAGER_ROLE");

    address public validator;
    mapping(uint256 => bool) public supportedChains;
    mapping(address => mapping(uint256 => bool)) public tokenChainsSupport;
    mapping(address => mapping(uint256 => bool)) public addrNoncesUsed;

    event swapInitialized(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 nonce,
        uint256 indexed chainId
    );

    modifier onlyManager {
        require(hasRole(CHAIN_MANAGER_ROLE, msg.sender), "don't have manager role");
        _;
    }

    constructor(uint256 _chainId){
        supportedChains[_chainId] = true;
        validator = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(CHAIN_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function swap(address _token, address _to, uint256 _amount, uint256 _nonce, uint256 _chainId) public {
        require(tokenChainsSupport[_token][_chainId], "chain is not supported");
        require(addrNoncesUsed[msg.sender][_nonce] == false, "transfer in progress");
        addrNoncesUsed[msg.sender][_nonce] = true;
        IGisToken(_token).burn(msg.sender, _amount);
        emit swapInitialized(msg.sender, _to, _amount, _nonce, _chainId);
    }

    function redeem(address _token, uint256 _amount, uint256 _nonce, uint256 _chainId, uint8 _v, bytes32 _r, bytes32 _s) public {
        require(supportedChains[_chainId], "chain is not supported");
        require(addrNoncesUsed[msg.sender][_nonce] == false, "transfer in progress");
        require(checkSign(msg.sender, _amount, _nonce, _chainId, _v, _r, _s), "check sign failure");
        addrNoncesUsed[msg.sender][_nonce] = true;
        IGisToken(_token).mint(msg.sender, _amount);
    }

    function checkSign(address _to, uint256 _amount, uint256 _nonce, uint256 _chainId, uint8 v, bytes32 r, bytes32 s) private view returns (bool){
        bytes32 message = keccak256(
            abi.encodePacked(_to, _amount, _nonce, _chainId)
        );
        address addr = ecrecover(hashMessage(message), v, r, s);
        if(addr == validator){
            return true;
        } else {
            return false;
        }
    }

    function hashMessage(bytes32 message) private pure returns(bytes32){
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        return keccak256(abi.encodePacked(prefix, message));
    }

    function includeToken(address _token, uint256 _chainId) onlyManager public {
        require(isContract(_token), "sended address is not a contract");
        require(tokenChainsSupport[_token][_chainId] == false, "token already has supported");
        tokenChainsSupport[_token][_chainId] = true;
    }

    function excludeToken(address _token, uint256 _chainId) onlyManager public {
        require(isContract(_token), "sended address is not a contract");
        require(tokenChainsSupport[_token][_chainId] == true, "token not supported");
        tokenChainsSupport[_token][_chainId] = false;
    }

    function updateChainById(uint256 _chainId) onlyManager public {
        supportedChains[_chainId] = !supportedChains[_chainId];
    }

    function setValidator(address _validator) onlyManager public {
        require(_validator != address(0), "zero address");
        validator = _validator;
    }

    function isContract(address _addr) private view returns(bool){
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }

    function isChainSupports(uint256 _chainId) public view returns(bool){
        return supportedChains[_chainId];
    }

    function isTokenSupportsChainId(address _token, uint256 _chainId) public view returns(bool){
        return tokenChainsSupport[_token][_chainId];
    }


}