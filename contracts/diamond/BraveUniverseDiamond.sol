// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* BraveUniverse Diamond Contract
* Based on EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
* 
* A modular smart contract system for the BraveUniverse ecosystem
* enabling upgradeable facets and shared storage.
/******************************************************************************/

import {LibDiamond} from "../libs/LibDiamond.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";
import {IERC173} from "../interfaces/IERC173.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title BraveUniverse Diamond
/// @author BraveUniverse Team
/// @notice Main Diamond contract for the BraveUniverse ecosystem
/// @dev This contract uses the diamond proxy pattern (EIP-2535)
contract BraveUniverseDiamond {
    /// @notice Diamond constructor
    /// @param _contractOwner The owner of the diamond
    /// @param _diamondCut Initial facet cuts to add basic functionality
    constructor(address _contractOwner, IDiamondCut.FacetCut[] memory _diamondCut) payable {
        LibDiamond.setContractOwner(_contractOwner);
        LibDiamond.diamondCut(_diamondCut, address(0), "");

        // Adding ERC165 data
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        
        // ERC165 interface IDs
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    }

    /// @notice Fallback function
    /// @dev Delegates all calls to facets using LibDiamond
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        
        // Get diamond storage
        assembly {
            ds.slot := position
        }
        
        // Get facet from function selector
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "BraveUniverseDiamond: Function does not exist");
        
        // Execute external function from facet using delegatecall and return any value.
        assembly {
            // Copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            
            // Execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            
            // Get any return value
            returndatacopy(0, 0, returndatasize())
            
            // Return any return value or error back to the caller
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }

    /// @notice Receive function to accept ETH
    receive() external payable {
        // Accept ETH transfers to the diamond
    }
} 