// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ILSP26FollowerSystem
 * @dev Interface for LSP26 Follower System
 * Based on https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-26-FollowerSystem.md
 */
interface ILSP26FollowerSystem {
    // Events
    event Follow(address indexed follower, address indexed addr);
    event Unfollow(address indexed follower, address indexed addr);

    // Core functions
    function follow(address addr) external;
    function unfollow(address addr) external;
    
    // View functions
    function isFollowing(address follower, address addr) external view returns (bool);
    function followerCount(address addr) external view returns (uint256);
    function followingCount(address follower) external view returns (uint256);
    function getFollowers(address addr) external view returns (address[] memory);
    function getFollowing(address follower) external view returns (address[] memory);
}