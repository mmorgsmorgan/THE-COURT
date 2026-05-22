// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title The Courtroom — onchain ritual judgment log
/// @notice Wallets bind an X username, then submit up to MAX_PER_WINDOW
///         verdicts in any 24h sliding window. Confessions and verdicts are
///         stored as keccak256 hashes only; full text lives off-chain.
contract TheCourtroom {
    // Ritual chain reports `block.timestamp` in milliseconds, not seconds —
    // so 24h must be expressed as 86_400_000, not the Solidity `24 hours` literal (86_400).
    uint256 public constant COOLDOWN = 86_400_000;
    uint8 public constant MAX_PER_WINDOW = 3;

    struct Verdict {
        bytes32 confessionHash;
        bytes32 verdictHash;
        uint64 timestamp;
        bool isLegendary;
    }

    mapping(address => string) public linkedUsername;
    mapping(address => Verdict) public lastVerdict;
    mapping(address => uint256) public verdictCount;

    // Ring buffer of the user's most recent MAX_PER_WINDOW verdict timestamps.
    // A new verdict is allowed when the OLDEST entry is more than COOLDOWN ago.
    mapping(address => uint64[3]) public recentJudgments;

    event IdentityBound(address indexed wallet, string username);
    event VerdictRecorded(
        address indexed wallet,
        bytes32 confessionHash,
        bytes32 verdictHash,
        uint64 timestamp,
        bool isLegendary
    );

    error RateLimited(uint256 nextAvailableAt);
    error EmptyUsername();
    error EmptyHash();

    /// @notice Bind an X username to msg.sender. Re-binding allowed (handles change).
    function bindIdentity(string calldata username) external {
        if (bytes(username).length == 0) revert EmptyUsername();
        linkedUsername[msg.sender] = username;
        emit IdentityBound(msg.sender, username);
    }

    /// @notice Record a verdict. Reverts if the user has already submitted
    ///         MAX_PER_WINDOW verdicts in the past COOLDOWN window.
    function recordVerdict(
        bytes32 confessionHash,
        bytes32 verdictHash,
        bool isLegendary
    ) external {
        if (confessionHash == bytes32(0) || verdictHash == bytes32(0)) {
            revert EmptyHash();
        }

        uint64[3] storage recents = recentJudgments[msg.sender];

        // Find oldest slot + index (for both rate-limit check and insertion).
        uint64 oldest = recents[0];
        uint8 oldestIdx = 0;
        for (uint8 i = 1; i < MAX_PER_WINDOW; i++) {
            if (recents[i] < oldest) {
                oldest = recents[i];
                oldestIdx = i;
            }
        }

        // All 3 slots filled and the oldest is still within the cooldown
        // window → rate-limited until the oldest expires.
        bool allFilled = recents[0] != 0 && recents[1] != 0 && recents[2] != 0;
        if (allFilled && block.timestamp < uint256(oldest) + COOLDOWN) {
            revert RateLimited(uint256(oldest) + COOLDOWN);
        }

        // Prefer an empty slot; otherwise overwrite the oldest.
        uint8 insertIdx = oldestIdx;
        for (uint8 i = 0; i < MAX_PER_WINDOW; i++) {
            if (recents[i] == 0) {
                insertIdx = i;
                break;
            }
        }

        uint64 ts = uint64(block.timestamp);
        recents[insertIdx] = ts;

        lastVerdict[msg.sender] = Verdict({
            confessionHash: confessionHash,
            verdictHash: verdictHash,
            timestamp: ts,
            isLegendary: isLegendary
        });
        unchecked {
            verdictCount[msg.sender] += 1;
        }

        emit VerdictRecorded(
            msg.sender,
            confessionHash,
            verdictHash,
            ts,
            isLegendary
        );
    }

    /// @notice True if `user` can submit a verdict right now.
    function canBeJudged(address user) external view returns (bool) {
        uint64[3] memory recents = recentJudgments[user];
        bool allFilled = recents[0] != 0 && recents[1] != 0 && recents[2] != 0;
        if (!allFilled) return true;
        uint64 oldest = recents[0];
        if (recents[1] < oldest) oldest = recents[1];
        if (recents[2] < oldest) oldest = recents[2];
        return block.timestamp >= uint256(oldest) + COOLDOWN;
    }

    /// @notice When `user` is next eligible. Returns 0 if eligible now.
    function nextJudgmentAt(address user) external view returns (uint256) {
        uint64[3] memory recents = recentJudgments[user];
        bool allFilled = recents[0] != 0 && recents[1] != 0 && recents[2] != 0;
        if (!allFilled) return 0;
        uint64 oldest = recents[0];
        if (recents[1] < oldest) oldest = recents[1];
        if (recents[2] < oldest) oldest = recents[2];
        uint256 nextAt = uint256(oldest) + COOLDOWN;
        return block.timestamp >= nextAt ? 0 : nextAt;
    }

    /// @notice Number of verdicts `user` has used in the current 24h window.
    function verdictsInWindow(address user) external view returns (uint8) {
        uint64[3] memory recents = recentJudgments[user];
        uint8 active = 0;
        for (uint8 i = 0; i < MAX_PER_WINDOW; i++) {
            if (
                recents[i] != 0 &&
                block.timestamp < uint256(recents[i]) + COOLDOWN
            ) {
                active++;
            }
        }
        return active;
    }
}
