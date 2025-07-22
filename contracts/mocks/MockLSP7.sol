// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockLSP7 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    
    constructor(string memory _name, string memory _symbol, uint256 _totalSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
    }
    
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external {
        // Allow transfers if:
        // 1. Sender is transferring their own tokens
        // 2. Sender has allowance
        // 3. This is called by the token owner (msg.sender == address(this) for callbacks)
        if (from != msg.sender) {
            require(allowance[from][msg.sender] >= amount, "Not authorized");
            allowance[from][msg.sender] -= amount;
        }
        
        require(balanceOf[from] >= amount, "Insufficient balance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}