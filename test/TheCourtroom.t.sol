// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {TheCourtroom} from "../contracts/TheCourtroom.sol";

contract TheCourtroomTest is Test {
    TheCourtroom courtroom;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    bytes32 constant CONFESSION_1 = keccak256("i posted on linkedin");
    bytes32 constant VERDICT_1 = keccak256("banished to twitter");
    bytes32 constant CONFESSION_2 = keccak256("i used comic sans");
    bytes32 constant VERDICT_2 = keccak256("touch grass");

    function setUp() public {
        courtroom = new TheCourtroom();
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
        courtroom.recordVerdict(CONFESSION_1, VERDICT_1, false);

        assertEq(courtroom.verdictCount(alice), 1);
        assertEq(courtroom.lastJudgmentAt(alice), block.timestamp);

        (
            bytes32 ch,
            bytes32 vh,
            uint64 ts,
            bool legendary
        ) = courtroom.lastVerdict(alice);
        assertEq(ch, CONFESSION_1);
        assertEq(vh, VERDICT_1);
        assertEq(ts, uint64(block.timestamp));
        assertFalse(legendary);
    }

    function test_recordVerdict_zeroHashReverts() public {
        vm.prank(alice);
        vm.expectRevert(TheCourtroom.EmptyHash.selector);
        courtroom.recordVerdict(bytes32(0), VERDICT_1, false);

        vm.prank(alice);
        vm.expectRevert(TheCourtroom.EmptyHash.selector);
        courtroom.recordVerdict(CONFESSION_1, bytes32(0), false);
    }

    function test_recordVerdict_cooldownEnforced() public {
        vm.prank(alice);
        courtroom.recordVerdict(CONFESSION_1, VERDICT_1, false);

        // Just shy of cooldown: still locked
        vm.warp(block.timestamp + courtroom.COOLDOWN() - 1);
        uint256 expectedNext = courtroom.nextJudgmentAt(alice);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                TheCourtroom.CooldownActive.selector,
                expectedNext
            )
        );
        courtroom.recordVerdict(CONFESSION_2, VERDICT_2, false);
    }

    function test_recordVerdict_afterCooldown() public {
        vm.prank(alice);
        courtroom.recordVerdict(CONFESSION_1, VERDICT_1, false);

        vm.warp(block.timestamp + courtroom.COOLDOWN());

        vm.prank(alice);
        courtroom.recordVerdict(CONFESSION_2, VERDICT_2, false);
        assertEq(courtroom.verdictCount(alice), 2);
    }

    function test_recordVerdict_legendaryFlag() public {
        vm.prank(alice);
        courtroom.recordVerdict(CONFESSION_1, VERDICT_1, true);

        (, , , bool legendary) = courtroom.lastVerdict(alice);
        assertTrue(legendary);
    }

    function test_recordVerdict_separateUsersDontShareCooldown() public {
        vm.prank(alice);
        courtroom.recordVerdict(CONFESSION_1, VERDICT_1, false);

        // Bob can still record — different sender
        vm.prank(bob);
        courtroom.recordVerdict(CONFESSION_2, VERDICT_2, false);
        assertEq(courtroom.verdictCount(bob), 1);
    }

    function test_recordVerdict_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit TheCourtroom.VerdictRecorded(
            alice,
            CONFESSION_1,
            VERDICT_1,
            uint64(block.timestamp),
            true
        );
        vm.prank(alice);
        courtroom.recordVerdict(CONFESSION_1, VERDICT_1, true);
    }

    // ── canBeJudged / nextJudgmentAt ───────────────────────

    function test_canBeJudged_initiallyTrue() public view {
        assertTrue(courtroom.canBeJudged(alice));
    }

    function test_canBeJudged_falseDuringCooldown() public {
        vm.prank(alice);
        courtroom.recordVerdict(CONFESSION_1, VERDICT_1, false);
        assertFalse(courtroom.canBeJudged(alice));
    }

    function test_canBeJudged_trueAfterCooldown() public {
        vm.prank(alice);
        courtroom.recordVerdict(CONFESSION_1, VERDICT_1, false);

        vm.warp(block.timestamp + courtroom.COOLDOWN());
        assertTrue(courtroom.canBeJudged(alice));
    }

    function test_nextJudgmentAt_zeroIfNeverJudged() public view {
        assertEq(courtroom.nextJudgmentAt(alice), 0);
    }

    function test_nextJudgmentAt_correctValue() public {
        vm.prank(alice);
        courtroom.recordVerdict(CONFESSION_1, VERDICT_1, false);
        assertEq(courtroom.nextJudgmentAt(alice), block.timestamp + courtroom.COOLDOWN());
    }
}
