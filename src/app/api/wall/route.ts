import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { ritualChain } from "@/lib/chain";
import { courtroomAbi, courtroomAddress } from "@/lib/courtroom-abi";

export const revalidate = 30;

const DEPLOY_BLOCK = BigInt(22_640_212);
const MAX_LOOKBACK = BigInt(200_000);
const MAX_RESULTS = 50;

const verdictRecordedEvent = parseAbiItem(
  "event VerdictRecorded(address indexed wallet, bytes32 confessionHash, bytes32 verdictHash, uint64 timestamp, bool isLegendary)"
);

export async function GET() {
  if (!courtroomAddress) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_COURTROOM_ADDRESS is not configured" },
      { status: 500 }
    );
  }

  const client = createPublicClient({
    chain: ritualChain,
    transport: http(),
  });

  try {
    const latest = await client.getBlockNumber();
    const window = latest > DEPLOY_BLOCK + MAX_LOOKBACK ? MAX_LOOKBACK : latest - DEPLOY_BLOCK;
    const fromBlock = latest - window;

    const logs = await client.getLogs({
      address: courtroomAddress,
      event: verdictRecordedEvent,
      fromBlock,
      toBlock: latest,
    });

    const sorted = [...logs].sort((a, b) => {
      const diff = b.blockNumber - a.blockNumber;
      if (diff !== BigInt(0)) return diff > BigInt(0) ? 1 : -1;
      return b.logIndex - a.logIndex;
    });

    const top = sorted.slice(0, MAX_RESULTS);

    const uniqueWallets = Array.from(
      new Set(top.map((l) => (l.args.wallet as Address).toLowerCase()))
    ) as Address[];

    const usernames: Record<string, string> = {};
    await Promise.all(
      uniqueWallets.map(async (w) => {
        try {
          const name = await client.readContract({
            address: courtroomAddress,
            abi: courtroomAbi,
            functionName: "linkedUsername",
            args: [w],
          });
          usernames[w.toLowerCase()] = name as string;
        } catch {
          usernames[w.toLowerCase()] = "";
        }
      })
    );

    const verdicts = top.map((l) => {
      const wallet = l.args.wallet as Address;
      return {
        wallet,
        username: usernames[wallet.toLowerCase()] || "",
        confessionHash: l.args.confessionHash as `0x${string}`,
        verdictHash: l.args.verdictHash as `0x${string}`,
        timestamp: Number(l.args.timestamp),
        isLegendary: l.args.isLegendary as boolean,
        txHash: l.transactionHash,
        blockNumber: Number(l.blockNumber),
      };
    });

    return NextResponse.json({
      verdicts,
      fromBlock: Number(fromBlock),
      latestBlock: Number(latest),
      count: verdicts.length,
    });
  } catch (err) {
    console.error("Wall fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch verdicts" },
      { status: 502 }
    );
  }
}
