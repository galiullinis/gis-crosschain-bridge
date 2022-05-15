//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IGisToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
    @title A cross-chain bridge between Ethereum based blockchains
    @author Ildar Galiullin S.
    @notice Not for production use!
    @custom:experimental This is an experimental contract.
 */
contract GisBridge is AccessControl {
    bytes32 public constant CHAIN_MANAGER_ROLE = keccak256("CHAIN_MANAGER_ROLE");

    uint256 public chainId;
    address public validator;
    mapping(uint256 => bool) public supportedChains;
    mapping(address => mapping(uint256 => bool)) public tokenChainsSupport;
    mapping(bytes32 => State) public transactionStates;

    enum State {
        None,
        Swapped,
        Redeemed
    }

    event swapInitialized(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 nonce,
        uint256 chainIdFrom,
        uint256 indexed chainIdTo
    );

    event redeemInitialized(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 nonce,
        uint256 chainIdFrom,
        uint256 indexed chainIdTo
    );

    modifier onlyManager {
        require(hasRole(CHAIN_MANAGER_ROLE, msg.sender), "don't have manager role");
        _;
    }

    constructor(uint256 _chainId){
        chainId = _chainId;
        supportedChains[_chainId] = true;
        validator = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(CHAIN_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /**
        @notice Initialize token swap
        This method burn user's tokens and emits event called 'swapInitialized'.
        @param _token The contract address of the token
        @param _to The recipient address on other blockchain
        @param _amount Amount of the tokens to send
        @param _nonce The unique nonce value to pass into hash
        @param _chainIdFrom The sender blockchain ID 
        @param _chainIdTo The recipient blockchain ID.
     */
    function swap(address _token, address _to, uint256 _amount, uint256 _nonce, uint256 _chainIdFrom, uint256 _chainIdTo) public {
        require(tokenChainsSupport[_token][_chainIdTo], "chain is not supported");
        bytes32 txHash = hash(msg.sender, _to, _amount, _nonce, _chainIdFrom, _chainIdTo);
        require(transactionStates[txHash] == State.None, "transfer in progress");
        transactionStates[txHash] = State.Swapped;
        IGisToken(_token).burn(msg.sender, _amount);
        emit swapInitialized(msg.sender, _to, _amount, _nonce, _chainIdFrom, _chainIdTo);
    }

    /**
        @notice Initialize token redeem
        This method mint tokens to user and emits event called 'redeemInitialized'.
        @param _token The contract address of the token
        @param _from The sender address on other blockchain
        @param _amount Amount of the tokens to send
        @param _nonce The unique nonce value to pass into hash
        @param _chainIdFrom The sender blockchain ID 
        @param _chainIdTo The recipient blockchain ID
        @param _v v value of the splitted ECDSA signature
        @param _r r value of the splitted ECDSA signature (first 32 bytes of the signature)
        @param _s s value of the splitted ECDSA signature (second 32 bytes of thre signature)
     */
    function redeem(address _token, address _from, uint256 _amount, uint256 _nonce, uint256 _chainIdFrom, uint256 _chainIdTo, uint8 _v, bytes32 _r, bytes32 _s) public {
        require(supportedChains[_chainIdTo], "chain is not supported");
        bytes32 txHash = hash(_from, msg.sender, _amount, _nonce, _chainIdFrom, _chainIdTo);
        require(transactionStates[txHash] == State.None, "transfer in progress");
        require(checkSign(txHash, _v, _r, _s), "check sign failure");
        transactionStates[txHash] = State.Redeemed;
        IGisToken(_token).mint(msg.sender, _amount);
        emit redeemInitialized(_from, msg.sender, _amount, _nonce, _chainIdFrom, _chainIdTo);
    }

    /**
        @notice Check if sended signature was signed by validator
        @param message message hash produced by keccak256
        @param v v value of the splitted ECDSA signature
        @param r r value of the splitted ECDSA signature (first 32 bytes of the signature)
        @param s s value of the splitted ECDSA signature (second 32 bytes of thre signature)
     */
    function checkSign(bytes32 message, uint8 v, bytes32 r, bytes32 s) private view returns (bool){
        address addr = ecrecover(hashMessage(message), v, r, s);
        if(addr == validator){
            return true;
        } else {
            return false;
        }
    }

    /**
        @notice Add the required Ethereum prefix to hash
        @param message The origin message
        @return hashMessage The message with prefix  
     */
    function hashMessage(bytes32 message) private pure returns(bytes32){
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        return keccak256(abi.encodePacked(prefix, message));
    }

    /**
        @notice Produce a hash of several params
        @param _from The sender address
        @param _to The recipient address
        @param _amount The amount of tokens to send
        @param _nonce The unique Nonce value
        @param _chainIdFrom The sender blockchain ID 
        @param _chainIdTo The recipient blockchain ID
        @return hash The keccak256 hash value
     */
    function hash(address _from, address _to, uint256 _amount, uint256 _nonce, uint256 _chainIdFrom, uint256 _chainIdTo) private pure returns(bytes32){
        return keccak256(abi.encodePacked(_from, _to, _amount, _nonce, _chainIdFrom, _chainIdTo));
    }

    /**
        @notice Include a token to support in the smart-contract
        @param _token The address of the token to support
        @param _chainId The blockchain ID of where the token located  
     */
    function includeToken(address _token, uint256 _chainId) onlyManager public {
        require(isContract(_token), "sended address is not a contract");
        require(tokenChainsSupport[_token][_chainId] == false, "token already has supported");
        tokenChainsSupport[_token][_chainId] = true;
    }

    /**
        @notice Exclude a supported token in the smart-contract
        @param _token The address of the token to support
        @param _chainId The blockchain ID of where the token is located  
     */
    function excludeToken(address _token, uint256 _chainId) onlyManager public {
        require(isContract(_token), "sended address is not a contract");
        require(tokenChainsSupport[_token][_chainId] == true, "token not supported");
        tokenChainsSupport[_token][_chainId] = false;
    }

    /**
        @notice Add support of the blockchain by ID
        @param _chainId The blockchain ID
     */
    function updateChainById(uint256 _chainId) onlyManager public {
        supportedChains[_chainId] = !supportedChains[_chainId];
    }

    /**
        @notice Change validator address
        @param _validator The new validator address
     */
    function setValidator(address _validator) onlyManager public {
        require(_validator != address(0), "zero address");
        validator = _validator;
    }

    /**
        @notice Check if the address is a contract address
        @param _addr The address to check
     */
    function isContract(address _addr) private view returns(bool){
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }

    /**
        @notice Check if blockchain supported in smart-contract
        @param _chainId The blockchain ID to check
     */
    function isChainSupports(uint256 _chainId) public view returns(bool){
        return supportedChains[_chainId];
    }

    /**
        @notice Check if token in blockchain supported in smart-contract
        @param _token The address of the token
        @param _chainId The blockchain ID where token is located
     */
    function isTokenSupportsChainId(address _token, uint256 _chainId) public view returns(bool){
        return tokenChainsSupport[_token][_chainId];
    }


}