export const courtroomAbi = [
  {
    type: "function",
    name: "bindIdentity",
    stateMutability: "nonpayable",
    inputs: [{ name: "username", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "recordVerdict",
    stateMutability: "nonpayable",
    inputs: [
      { name: "confessionHash", type: "bytes32" },
      { name: "verdictHash", type: "bytes32" },
      { name: "isLegendary", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "canBeJudged",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "nextJudgmentAt",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "linkedUsername",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "verdictCount",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "IdentityBound",
    inputs: [
      { name: "wallet", type: "address", indexed: true },
      { name: "username", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "VerdictRecorded",
    inputs: [
      { name: "wallet", type: "address", indexed: true },
      { name: "confessionHash", type: "bytes32", indexed: false },
      { name: "verdictHash", type: "bytes32", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
      { name: "isLegendary", type: "bool", indexed: false },
    ],
    anonymous: false,
  },
] as const;

const RAW_ADDRESS = process.env.NEXT_PUBLIC_COURTROOM_ADDRESS;

export const courtroomAddress = (RAW_ADDRESS ?? "") as `0x${string}`;

export function assertCourtroomAddress(): `0x${string}` {
  if (!RAW_ADDRESS) {
    throw new Error(
      "NEXT_PUBLIC_COURTROOM_ADDRESS is not set — deploy the contract and add the address to .env.local"
    );
  }
  return RAW_ADDRESS as `0x${string}`;
}
