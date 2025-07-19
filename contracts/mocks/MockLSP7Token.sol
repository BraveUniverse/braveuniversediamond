// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/ILSP7DigitalAsset.sol";

/**
 * @title MockLSP7Token
 * @dev Mock implementation of LSP7 Digital Asset for testing
 */
contract MockLSP7Token is ILSP7DigitalAsset {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _operators;
    mapping(address => address[]) private _operatorsList;
    
    uint256 private _totalSupply;
    uint8 private _decimals;
    string public name;
    string public symbol;
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _tokenDecimals,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        _decimals = _tokenDecimals;
        _totalSupply = _initialSupply;
        _balances[msg.sender] = _initialSupply;
        
        emit Transfer(address(0), msg.sender, _initialSupply, true, "");
    }
    
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address tokenOwner) external view override returns (uint256) {
        return _balances[tokenOwner];
    }
    
    function decimals() external view override returns (uint8) {
        return _decimals;
    }
    
    function transfer(
        address from,
        address to,
        uint256 amount,
        bool force,
        bytes calldata data
    ) external override {
        require(from == msg.sender || _operators[from][msg.sender] >= amount, "Not authorized");
        require(_balances[from] >= amount, "Insufficient balance");
        require(to != address(0), "Invalid recipient");
        
        _balances[from] -= amount;
        _balances[to] += amount;
        
        if (msg.sender != from && _operators[from][msg.sender] != type(uint256).max) {
            _operators[from][msg.sender] -= amount;
        }
        
        emit Transfer(from, to, amount, force, data);
    }
    
    function transferBatch(
        address[] calldata from,
        address[] calldata to,
        uint256[] calldata amount,
        bool[] calldata force,
        bytes[] calldata data
    ) external override {
        require(
            from.length == to.length && 
            from.length == amount.length && 
            from.length == force.length && 
            from.length == data.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < from.length; i++) {
            this.transfer(from[i], to[i], amount[i], force[i], data[i]);
        }
    }
    
    function authorizeOperator(address operator, uint256 amount) external override {
        require(operator != address(0), "Invalid operator");
        
        if (_operators[msg.sender][operator] == 0 && amount > 0) {
            _operatorsList[msg.sender].push(operator);
        }
        
        _operators[msg.sender][operator] = amount;
        emit OperatorAuthorizationChanged(msg.sender, operator, amount);
    }
    
    function revokeOperator(address operator) external override {
        _operators[msg.sender][operator] = 0;
        
        // Remove from operators list
        address[] storage operators = _operatorsList[msg.sender];
        for (uint256 i = 0; i < operators.length; i++) {
            if (operators[i] == operator) {
                operators[i] = operators[operators.length - 1];
                operators.pop();
                break;
            }
        }
        
        emit OperatorRevoked(msg.sender, operator);
    }
    
    function authorizedAmountFor(address operator, address tokenOwner) external view override returns (uint256) {
        return _operators[tokenOwner][operator];
    }
    
    function getOperatorsOf(address tokenOwner) external view override returns (address[] memory) {
        return _operatorsList[tokenOwner];
    }
    
    // Mint function for testing
    function mint(address to, uint256 amount) external {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount, true, "");
    }
}