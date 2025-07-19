import { ethers } from "hardhat";
import { Contract } from "ethers";

export enum FacetCutAction {
    Add = 0,
    Replace = 1,
    Remove = 2
}

export function getSelectors(contract: Contract) {
    const signatures = Object.keys(contract.interface.fragments)
        .filter(name => name !== 'constructor')
        .map(name => contract.interface.fragments[name]);
    
    const selectors = signatures.reduce((acc: string[], val) => {
        if (ethers.Fragment.isFunction(val)) {
            acc.push(val.selector);
        }
        return acc;
    }, []);
    
    return {
        contract,
        selectors
    };
}

export function removeSelectors(selectors: string[], removeSelectors: string[]) {
    return selectors.filter(s => !removeSelectors.includes(s));
}

export function findAddressPositionInFacets(facetAddress: string, facets: any[]) {
    for (let i = 0; i < facets.length; i++) {
        if (facets[i].facetAddress === facetAddress) {
            return i;
        }
    }
    return -1;
}