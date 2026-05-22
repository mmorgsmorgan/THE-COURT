"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, retry: 2 },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="bottom-right"
          gutter={8}
          toastOptions={{
            style: {
              background: "#0a0f1a",
              color: "#e2e8f0",
              border: "1px solid #1a2332",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              borderRadius: "0",
              padding: "12px 16px",
              maxWidth: "380px",
            },
            duration: 4000,
            success: {
              duration: 5000,
              iconTheme: { primary: "#00ff41", secondary: "#0a0f1a" },
              style: { border: "1px solid rgba(0, 255, 65, 0.3)" },
            },
            error: {
              duration: 6000,
              iconTheme: { primary: "#ff0040", secondary: "#0a0f1a" },
              style: { border: "1px solid rgba(255, 0, 64, 0.3)" },
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
