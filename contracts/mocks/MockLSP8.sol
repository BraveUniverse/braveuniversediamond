// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockLSP8 {
    string public name;
    string public symbol;
    
    mapping(bytes32 => address) public tokenOwnerOf;
    mapping(address => uint256) public balanceOf;
    mapping(bytes32 => mapping(address => bool)) public isOperatorFor;
    
    event Transfer(address indexed from, address indexed to, bytes32 indexed tokenId);
    event OperatorAuthorizationChanged(address indexed operator, address indexed tokenOwner, bytes32 indexed tokenId, bool authorized);
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }
    
    function transfer(address from, address to, bytes32 tokenId, bool force, bytes memory data) external {
        require(tokenOwnerOf[tokenId] == from, "Not token owner");
        require(from == msg.sender || isOperatorFor[tokenId][msg.sender], "Not authorized");
        
        tokenOwnerOf[tokenId] = to;
        balanceOf[from]--;
        balanceOf[to]++;
        
        emit Transfer(from, to, tokenId);
    }
    
    function mint(address to, bytes32 tokenId) external {
        require(tokenOwnerOf[tokenId] == address(0), "Token already exists");
        
        tokenOwnerOf[tokenId] = to;
        balanceOf[to]++;
        
        emit Transfer(address(0), to, tokenId);
    }
    
    function authorizeOperator(address operator, bytes32 tokenId) external {
        require(tokenOwnerOf[tokenId] == msg.sender, "Not token owner");
        
        isOperatorFor[tokenId][operator] = true;
        emit OperatorAuthorizationChanged(operator, msg.sender, tokenId, true);
    }
    
    function revokeOperator(address operator, bytes32 tokenId) external {
        require(tokenOwnerOf[tokenId] == msg.sender, "Not token owner");
        
        isOperatorFor[tokenId][operator] = false;
        emit OperatorAuthorizationChanged(operator, msg.sender, tokenId, false);
    }
}