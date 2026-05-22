import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { ritualChain } from "./chain";

export const wagmiConfig = createConfig({
  chains: [ritualChain],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(process.env.NEXT_PUBLIC_WC_PROJECT_ID
      ? [walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID })]
      : []),
  ],
  transports: {
    [ritualChain.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.ritualfoundation.org"
    ),
  },
});
