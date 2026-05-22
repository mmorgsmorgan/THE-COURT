// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TheCourtroom} from "../contracts/TheCourtroom.sol";

contract Deploy is Script {
    function run() external returns (TheCourtroom courtroom) {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        courtroom = new TheCourtroom();
        vm.stopBroadcast();

        console2.log("TheCourtroom deployed at:", address(courtroom));
        console2.log("Chain id:", block.chainid);
    }
}
