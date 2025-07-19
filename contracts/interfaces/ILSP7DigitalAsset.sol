// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ILSP7DigitalAsset
 * @dev Interface for LSP7 Digital Asset (Fungible Token) standard
 * Based on https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-7-DigitalAsset.md
 */
interface ILSP7DigitalAsset {
    // Events
    event Transfer(address indexed from, address indexed to, uint256 amount, bool force, bytes data);
    event OperatorAuthorizationChanged(address indexed tokenOwner, address indexed operator, uint256 amount);
    event OperatorRevoked(address indexed tokenOwner, address indexed operator);

    // Core functions
    function totalSupply() external view returns (uint256);
    function balanceOf(address tokenOwner) external view returns (uint256);
    function decimals() external view returns (uint8);
    
    // Transfer functions
    function transfer(address from, address to, uint256 amount, bool force, bytes calldata data) external;
    function transferBatch(address[] calldata from, address[] calldata to, uint256[] calldata amount, bool[] calldata force, bytes[] calldata data) external;
    
    // Operator functions
    function authorizeOperator(address operator, uint256 amount) external;
    function revokeOperator(address operator) external;
    function authorizedAmountFor(address operator, address tokenOwner) external view returns (uint256);
    function getOperatorsOf(address tokenOwner) external view returns (address[] memory);
}