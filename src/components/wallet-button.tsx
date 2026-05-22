"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="btn-neon text-xs flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-[#00ff41] inline-block" />
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button onClick={() => open()} className="btn-neon w-full">
      CONNECT WALLET
    </button>
  );
}
