// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {TheCourtroom} from "../contracts/TheCourtroom.sol";

contract TheCourtroomTest is Test {
    TheCourtroom courtroom;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    bytes32 constant C1 = keccak256("c1");
    bytes32 constant V1 = keccak256("v1");
    bytes32 constant C2 = keccak256("c2");
    bytes32 constant V2 = keccak256("v2");
    bytes32 constant C3 = keccak256("c3");
    bytes32 constant V3 = keccak256("v3");
    bytes32 constant C4 = keccak256("c4");
    bytes32 constant V4 = keccak256("v4");

    function setUp() public {
        courtroom = new TheCourtroom();
        // Move past block.timestamp == 0 so the contract's "slot == 0 means empty"
        // sentinel actually works (timestamps must be non-zero).
        vm.warp(courtroom.COOLDOWN() + 1);
    }

    // ── bindIdentity ───────────────────────────────────────

    function test_bindIdentity_setsUsername() public {
        vm.prank(alice);
        courtroom.bindIdentity("alice");
        assertEq(courtroom.linkedUsername(alice), "alice");
    }

    function test_bindIdentity_emptyReverts() public {
        vm.prank(alice);
        vm.expectRevert(TheCourtroom.EmptyUsername.selector);
        courtroom.bindIdentity("");
    }

    function test_bindIdentity_rebindAllowed() public {
        vm.prank(alice);
        courtroom.bindIdentity("alice");
        vm.prank(alice);
        courtroom.bindIdentity("alice_v2");
        assertEq(courtroom.linkedUsername(alice), "alice_v2");
    }

    function test_bindIdentity_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit TheCourtroom.IdentityBound(alice, "alice");
        vm.prank(alice);
        courtroom.bindIdentity("alice");
    }

    // ── recordVerdict ──────────────────────────────────────

    function test_recordVerdict_firstTime() public {
        vm.prank(alice);
        courtroom.recordVerdict(C1, V1, false);

        assertEq(courtroom.verdictCount(alice), 1);
        assertEq(courtroom.verdictsInWindow(alice), 1);

        (bytes32 ch, bytes32 vh, uint64 ts, bool legendary) = courtroom
            .lastVerdict(alice);
        assertEq(ch, C1);
        assertEq(vh, V1);
        assertEq(ts, uint64(block.timestamp));
        assertFalse(legendary);
    }

    function test_recordVerdict_zeroHashReverts() public {
        vm.prank(alice);
        vm.expectRevert(TheCourtroom.EmptyHash.selector);
        courtroom.recordVerdict(bytes32(0), V1, false);

        vm.prank(alice);
        vm.expectRevert(TheCourtroom.EmptyHash.selector);
        courtroom.recordVerdict(C1, bytes32(0), false);
    }

    function test_recordVerdict_threeInWindowAllowed() public {
        vm.startPrank(alice);
        courtroom.recordVerdict(C1, V1, false);
        vm.warp(block.timestamp + 1 hours);
        courtroom.recordVerdict(C2, V2, false);
        vm.warp(block.timestamp + 1 hours);
        courtroom.recordVerdict(C3, V3, false);
        vm.stopPrank();

        assertEq(courtroom.verdictCount(alice), 3);
        assertEq(courtroom.verdictsInWindow(alice), 3);
    }

    function test_recordVerdict_fourthRevertsWhileWindowFull() public {
        vm.startPrank(alice);
        courtroom.recordVerdict(C1, V1, false);
        uint256 firstTs = block.timestamp;
        vm.warp(block.timestamp + 1 hours);
        courtroom.recordVerdict(C2, V2, false);
        vm.warp(block.timestamp + 1 hours);
        courtroom.recordVerdict(C3, V3, false);

        uint256 expectedNext = firstTs + courtroom.COOLDOWN();
        vm.expectRevert(
            abi.encodeWithSelector(
                TheCourtroom.RateLimited.selector,
                expectedNext
            )
        );
        courtroom.recordVerdict(C4, V4, false);
        vm.stopPrank();
    }

    function test_recordVerdict_fourthAfterOldestExpires() public {
        vm.startPrank(alice);
        courtroom.recordVerdict(C1, V1, false);
        vm.warp(block.timestamp + 1 hours);
        courtroom.recordVerdict(C2, V2, false);
        vm.warp(block.timestamp + 1 hours);
        courtroom.recordVerdict(C3, V3, false);

        // Wait until the FIRST verdict's cooldown expires.
        vm.warp(block.timestamp + courtroom.COOLDOWN() - 2 hours + 1);
        courtroom.recordVerdict(C4, V4, false);
        vm.stopPrank();

        assertEq(courtroom.verdictCount(alice), 4);
        // After the warp, verdict 1 should have fallen out of the window
        // (only verdicts 2, 3, 4 are within COOLDOWN of now).
        assertEq(courtroom.verdictsInWindow(alice), 3);
    }

    function test_recordVerdict_legendaryFlag() public {
        vm.prank(alice);
        courtroom.recordVerdict(C1, V1, true);
        (, , , bool legendary) = courtroom.lastVerdict(alice);
        assertTrue(legendary);
    }

    function test_recordVerdict_separateUsersDontShareWindow() public {
        vm.startPrank(alice);
        courtroom.recordVerdict(C1, V1, false);
        courtroom.recordVerdict(C2, V2, false);
        courtroom.recordVerdict(C3, V3, false);
        vm.stopPrank();

        // Bob has his own window
        vm.prank(bob);
        courtroom.recordVerdict(C1, V1, false);
        assertEq(courtroom.verdictCount(bob), 1);
    }

    function test_recordVerdict_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit TheCourtroom.VerdictRecorded(
            alice,
            C1,
            V1,
            uint64(block.timestamp),
            true
        );
        vm.prank(alice);
        courtroom.recordVerdict(C1, V1, true);
    }

    // ── canBeJudged / nextJudgmentAt ───────────────────────

    function test_canBeJudged_initiallyTrue() public view {
        assertTrue(courtroom.canBeJudged(alice));
    }

    function test_canBeJudged_trueAfterOneOrTwoVerdicts() public {
        vm.prank(alice);
        courtroom.recordVerdict(C1, V1, false);
        assertTrue(courtroom.canBeJudged(alice));

        vm.prank(alice);
        courtroom.recordVerdict(C2, V2, false);
        assertTrue(courtroom.canBeJudged(alice));
    }

    function test_canBeJudged_falseWhenWindowFull() public {
        vm.startPrank(alice);
        courtroom.recordVerdict(C1, V1, false);
        courtroom.recordVerdict(C2, V2, false);
        courtroom.recordVerdict(C3, V3, false);
        vm.stopPrank();
        assertFalse(courtroom.canBeJudged(alice));
    }

    function test_canBeJudged_trueAfterOldestExpires() public {
        vm.startPrank(alice);
        courtroom.recordVerdict(C1, V1, false);
        courtroom.recordVerdict(C2, V2, false);
        courtroom.recordVerdict(C3, V3, false);
        vm.stopPrank();

        vm.warp(block.timestamp + courtroom.COOLDOWN());
        assertTrue(courtroom.canBeJudged(alice));
    }

    function test_nextJudgmentAt_zeroIfEligible() public view {
        assertEq(courtroom.nextJudgmentAt(alice), 0);
    }

    function test_nextJudgmentAt_pointsAtOldestPlusCooldown() public {
        vm.startPrank(alice);
        courtroom.recordVerdict(C1, V1, false);
        uint256 firstTs = block.timestamp;
        vm.warp(block.timestamp + 1 hours);
        courtroom.recordVerdict(C2, V2, false);
        vm.warp(block.timestamp + 1 hours);
        courtroom.recordVerdict(C3, V3, false);
        vm.stopPrank();

        assertEq(
            courtroom.nextJudgmentAt(alice),
            firstTs + courtroom.COOLDOWN()
        );
    }
}
