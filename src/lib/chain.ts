import { defineChain } from "viem";

export const ritualChain = defineChain({
  id: 1979,
  name: "Ritual",
  nativeCurrency: {
    decimals: 18,
    name: "Ritual",
    symbol: "RITUAL",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.ritualfoundation.org",
      ],
      webSocket: [
        process.env.NEXT_PUBLIC_WS_URL ?? "wss://rpc.ritualfoundation.org/ws",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org",
    },
  },
  contracts: {
    multicall3: {
      address: "0x5577Ea679673Ec7508E9524100a188E7600202a3",
    },
  },
});
