// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";

/// @title TestFacet
/// @author BraveUniverse Team
/// @notice A simple test facet that demonstrates different behavior for owner vs users
contract TestFacet {
    
    /// @notice Returns a greeting message, different for owner vs regular users
    /// @return greeting The greeting message
    function getGreeting() external view returns (string memory greeting) {
        address owner = LibDiamond.contractOwner();
        
        if (msg.sender == owner) {
            return "Hello Boss! You are the Diamond owner.";
        } else {
            return "Hello User! Welcome to BraveUniverse.";
        }
    }
    
    /// @notice Returns caller information
    /// @return caller The address of the caller
    /// @return isOwner Whether the caller is the owner
    function getCallerInfo() external view returns (address caller, bool isOwner) {
        caller = msg.sender;
        isOwner = (msg.sender == LibDiamond.contractOwner());
    }
    
    /// @notice Owner-only function that returns secret message
    /// @return secret The secret message (only accessible by owner)
    function getSecretMessage() external view returns (string memory secret) {
        LibDiamond.enforceIsContractOwner();
        return "This is a secret message only the owner can see!";
    }
    
    /// @notice Returns a number based on caller type
    /// @return number 100 for owner, 42 for regular users
    function getMagicNumber() external view returns (uint256 number) {
        address owner = LibDiamond.contractOwner();
        
        if (msg.sender == owner) {
            return 100; // Special number for owner
        } else {
            return 42;  // Regular number for users
        }
    }
}