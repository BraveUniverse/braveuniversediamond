// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ILSP8IdentifiableDigitalAsset
 * @dev Interface for LSP8 Identifiable Digital Asset (NFT) standard
 * Based on https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-8-IdentifiableDigitalAsset.md
 */
interface ILSP8IdentifiableDigitalAsset {
    // Events
    event Transfer(address indexed operator, address indexed from, address indexed to, bytes32 tokenId, bool force, bytes data);
    event OperatorAuthorizationChanged(address indexed operator, address indexed tokenOwner, bytes32 indexed tokenId, bytes operatorNotificationData);
    event OperatorRevoked(address indexed operator, address indexed tokenOwner, bytes32 indexed tokenId, bool notified, bytes operatorNotificationData);

    // Core functions
    function totalSupply() external view returns (uint256);
    function balanceOf(address tokenOwner) external view returns (uint256);
    function tokenOwnerOf(bytes32 tokenId) external view returns (address);
    function tokenIdsOf(address tokenOwner) external view returns (bytes32[] memory);
    
    // Transfer functions
    function transfer(address from, address to, bytes32 tokenId, bool force, bytes calldata data) external;
    function transferBatch(address[] calldata from, address[] calldata to, bytes32[] calldata tokenId, bool[] calldata force, bytes[] calldata data) external;
    
    // Operator functions
    function authorizeOperator(address operator, bytes32 tokenId, bytes calldata operatorNotificationData) external;
    function revokeOperator(address operator, bytes32 tokenId, bool notify, bytes calldata operatorNotificationData) external;
    function isOperatorFor(address operator, bytes32 tokenId) external view returns (bool);
    function getOperatorsOf(bytes32 tokenId) external view returns (address[] memory);
}