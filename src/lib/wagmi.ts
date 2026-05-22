import { cookieStorage, createStorage, type Config } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { ritualChain } from "./chain";

export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";

if (!projectId && typeof window !== "undefined") {
  console.warn(
    "NEXT_PUBLIC_WC_PROJECT_ID is not set — Reown AppKit will not initialize. Get a project ID at https://cloud.reown.com."
  );
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  ritualChain as AppKitNetwork,
];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId: projectId || "fallback",
  networks,
});

export const wagmiConfig: Config = wagmiAdapter.wagmiConfig;
