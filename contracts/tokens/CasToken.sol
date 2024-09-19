// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CasToken is ERC20("CasToken", "CTK") {
    address public owner;

    constructor() {
        owner = msg.sender;
        _mint(msg.sender, 1000000e18);
    }

    function mint(uint _amount) external {
        require(msg.sender == owner, "you are not owner");
        _mint(msg.sender, _amount * 1e18);
    }
}