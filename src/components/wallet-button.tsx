"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ritualChain } from "@/lib/chain";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

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
    <div className="flex flex-col gap-3">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() =>
            connect({ connector, chainId: ritualChain.id })
          }
          className="btn-neon w-full"
        >
          {connector.name === "Injected"
            ? "METAMASK / RABBY"
            : connector.name.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
