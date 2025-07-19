// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/ILSP8IdentifiableDigitalAsset.sol";

/**
 * @title MockLSP8NFT
 * @dev Mock implementation of LSP8 Identifiable Digital Asset for testing
 */
contract MockLSP8NFT is ILSP8IdentifiableDigitalAsset {
    mapping(bytes32 => address) private _tokenOwners;
    mapping(address => bytes32[]) private _ownedTokens;
    mapping(bytes32 => mapping(address => bool)) private _operators;
    mapping(bytes32 => address[]) private _tokenOperators;
    
    uint256 private _totalSupply;
    string public name;
    string public symbol;
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }
    
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address tokenOwner) external view override returns (uint256) {
        return _ownedTokens[tokenOwner].length;
    }
    
    function tokenOwnerOf(bytes32 tokenId) external view override returns (address) {
        address owner = _tokenOwners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }
    
    function tokenIdsOf(address tokenOwner) external view override returns (bytes32[] memory) {
        return _ownedTokens[tokenOwner];
    }
    
    function transfer(
        address from,
        address to,
        bytes32 tokenId,
        bool force,
        bytes calldata data
    ) external override {
        require(_tokenOwners[tokenId] == from, "Not token owner");
        require(from == msg.sender || _operators[tokenId][msg.sender], "Not authorized");
        require(to != address(0), "Invalid recipient");
        
        // Remove from current owner
        _removeTokenFromOwner(from, tokenId);
        
        // Add to new owner
        _tokenOwners[tokenId] = to;
        _ownedTokens[to].push(tokenId);
        
        // Clear operators
        for (uint256 i = 0; i < _tokenOperators[tokenId].length; i++) {
            _operators[tokenId][_tokenOperators[tokenId][i]] = false;
        }
        delete _tokenOperators[tokenId];
        
        emit Transfer(msg.sender, from, to, tokenId, force, data);
    }
    
    function transferBatch(
        address[] calldata from,
        address[] calldata to,
        bytes32[] calldata tokenId,
        bool[] calldata force,
        bytes[] calldata data
    ) external override {
        require(
            from.length == to.length && 
            from.length == tokenId.length && 
            from.length == force.length && 
            from.length == data.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < from.length; i++) {
            this.transfer(from[i], to[i], tokenId[i], force[i], data[i]);
        }
    }
    
    function authorizeOperator(
        address operator,
        bytes32 tokenId,
        bytes calldata operatorNotificationData
    ) external override {
        require(_tokenOwners[tokenId] == msg.sender, "Not token owner");
        require(operator != address(0), "Invalid operator");
        
        if (!_operators[tokenId][operator]) {
            _operators[tokenId][operator] = true;
            _tokenOperators[tokenId].push(operator);
        }
        
        emit OperatorAuthorizationChanged(operator, msg.sender, tokenId, operatorNotificationData);
    }
    
    function revokeOperator(
        address operator,
        bytes32 tokenId,
        bool notify,
        bytes calldata operatorNotificationData
    ) external override {
        require(_tokenOwners[tokenId] == msg.sender, "Not token owner");
        
        _operators[tokenId][operator] = false;
        
        // Remove from operators list
        address[] storage operators = _tokenOperators[tokenId];
        for (uint256 i = 0; i < operators.length; i++) {
            if (operators[i] == operator) {
                operators[i] = operators[operators.length - 1];
                operators.pop();
                break;
            }
        }
        
        emit OperatorRevoked(operator, msg.sender, tokenId, notify, operatorNotificationData);
    }
    
    function isOperatorFor(address operator, bytes32 tokenId) external view override returns (bool) {
        return _operators[tokenId][operator];
    }
    
    function getOperatorsOf(bytes32 tokenId) external view override returns (address[] memory) {
        return _tokenOperators[tokenId];
    }
    
    // Helper function to remove token from owner
    function _removeTokenFromOwner(address owner, bytes32 tokenId) private {
        bytes32[] storage tokens = _ownedTokens[owner];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }
    
    // Mint function for testing
    function mint(address to, bytes32 tokenId) external {
        require(_tokenOwners[tokenId] == address(0), "Token already exists");
        
        _totalSupply++;
        _tokenOwners[tokenId] = to;
        _ownedTokens[to].push(tokenId);
        
        emit Transfer(msg.sender, address(0), to, tokenId, true, "");
    }
}