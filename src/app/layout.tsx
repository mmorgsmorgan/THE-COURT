import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Courtroom — AI Judgment on Ritual Chain",
  description:
    "Confess your internet crimes. Receive AI-generated judgment. Sign the verdict onchain. One verdict every 24 hours.",
  keywords: [
    "Ritual",
    "AI",
    "courtroom",
    "judgment",
    "blockchain",
    "web3",
    "confession",
  ],
  openGraph: {
    title: "The Courtroom — AI Judgment on Ritual Chain",
    description:
      "Confess your internet crimes. Receive AI-generated judgment. Sign the verdict onchain.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Courtroom — AI Judgment on Ritual Chain",
    description:
      "Confess your internet crimes. Receive AI-generated judgment. Sign the verdict onchain.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-court-bg text-court-text font-body antialiased min-h-screen">
        <Providers>{children}</Providers>
        {/* CRT Scanline overlay */}
        <div className="crt-overlay" />
      </body>
    </html>
  );
}
