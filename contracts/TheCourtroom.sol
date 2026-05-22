// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title The Courtroom — onchain ritual judgment log
/// @notice Wallets bind an X username, then submit one verdict per 24h.
///         Confessions and verdicts are stored as keccak256 hashes only;
///         full text lives off-chain (and in the user's screenshot).
contract TheCourtroom {
    // Ritual chain reports `block.timestamp` in milliseconds, not seconds —
    // so 24h must be expressed as 86_400_000, not the Solidity `24 hours` literal (86_400).
    uint256 public constant COOLDOWN = 86_400_000;

    struct Verdict {
        bytes32 confessionHash;
        bytes32 verdictHash;
        uint64 timestamp;
        bool isLegendary;
    }

    mapping(address => uint256) public lastJudgmentAt;
    mapping(address => string) public linkedUsername;
    mapping(address => Verdict) public lastVerdict;
    mapping(address => uint256) public verdictCount;

    event IdentityBound(address indexed wallet, string username);
    event VerdictRecorded(
        address indexed wallet,
        bytes32 confessionHash,
        bytes32 verdictHash,
        uint64 timestamp,
        bool isLegendary
    );

    error CooldownActive(uint256 nextAvailableAt);
    error EmptyUsername();
    error EmptyHash();

    /// @notice Bind an X username to msg.sender. Re-binding allowed (handles change).
    function bindIdentity(string calldata username) external {
        if (bytes(username).length == 0) revert EmptyUsername();
        linkedUsername[msg.sender] = username;
        emit IdentityBound(msg.sender, username);
    }

    /// @notice Record a verdict. Reverts if msg.sender is within the 24h cooldown.
    function recordVerdict(
        bytes32 confessionHash,
        bytes32 verdictHash,
        bool isLegendary
    ) external {
        if (confessionHash == bytes32(0) || verdictHash == bytes32(0)) {
            revert EmptyHash();
        }

        uint256 nextAt = lastJudgmentAt[msg.sender] + COOLDOWN;
        if (lastJudgmentAt[msg.sender] != 0 && block.timestamp < nextAt) {
            revert CooldownActive(nextAt);
        }

        uint64 ts = uint64(block.timestamp);
        lastJudgmentAt[msg.sender] = block.timestamp;
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

    function canBeJudged(address user) external view returns (bool) {
        uint256 last = lastJudgmentAt[user];
        if (last == 0) return true;
        return block.timestamp >= last + COOLDOWN;
    }

    function nextJudgmentAt(address user) external view returns (uint256) {
        uint256 last = lastJudgmentAt[user];
        if (last == 0) return 0;
        return last + COOLDOWN;
    }
}
