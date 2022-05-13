//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGisToken {
    function balanceOf(address _owner) external view returns (uint256);

    function transfer(address _to, uint256 _value) external returns (bool);

    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);

    function approve(address _spender, uint256 _value) external returns(bool);

    function allowance(address _owner, address _spender) external view returns(uint256);

    function mint(address account, uint256 amount) external;
    
    function burn(address account, uint256 amount) external;
}