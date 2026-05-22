"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GlitchText } from "@/components/glitch-text";

const EXPLORER = "https://explorer.ritualfoundation.org";

type Verdict = {
  wallet: `0x${string}`;
  username: string;
  confessionHash: `0x${string}`;
  verdictHash: `0x${string}`;
  timestamp: number;
  isLegendary: boolean;
  txHash: `0x${string}`;
  blockNumber: number;
};

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

function relTime(secAgo: number) {
  if (secAgo < 60) return `${secAgo}s ago`;
  if (secAgo < 3600) return `${Math.floor(secAgo / 60)}m ago`;
  if (secAgo < 86_400) return `${Math.floor(secAgo / 3600)}h ago`;
  return `${Math.floor(secAgo / 86_400)}d ago`;
}

export default function WallPage() {
  const [verdicts, setVerdicts] = useState<Verdict[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wall", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVerdicts(data.verdicts);
      setLatestBlock(data.latestBlock ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen grid-bg px-4 py-16 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00ff41]/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-court-bg/80 backdrop-blur-sm border-b border-court-border">
        <Link href="/" className="font-heading text-sm text-[#00ff41] neon-glow tracking-wider">
          THE COURTROOM
        </Link>
        <Link href="/courtroom" className="font-mono text-xs text-court-muted hover:text-[#00ff41] tracking-wider">
          ENTER COURT →
        </Link>
      </div>

      <div className="max-w-3xl mx-auto relative z-10 mt-12">
        <div className="text-center mb-12">
          <GlitchText
            text="WALL OF VERDICTS"
            as="h1"
            className="text-3xl sm:text-5xl text-[#00ff41] neon-glow mb-4"
          />
          <p className="font-mono text-court-muted text-xs tracking-[0.3em]">
            PUBLIC RECORD • RITUAL CHAIN
          </p>
        </div>

        <div className="flex items-center justify-between mb-6 px-1">
          <p className="font-mono text-court-muted text-xs tracking-wider">
            {latestBlock ? `BLOCK ${latestBlock.toLocaleString()}` : "—"}
            {verdicts && ` • ${verdicts.length} VERDICTS`}
          </p>
          <button
            onClick={load}
            disabled={loading}
            className="font-mono text-[10px] tracking-[0.2em] text-court-muted hover:text-[#00ff41] disabled:opacity-40"
          >
            {loading ? "REFRESHING…" : "↻ REFRESH"}
          </button>
        </div>

        {error && (
          <div className="border border-court-red/40 bg-court-red/5 p-4 text-center">
            <p className="font-mono text-court-red text-sm">{error}</p>
          </div>
        )}

        {!error && verdicts && verdicts.length === 0 && (
          <div className="border border-court-border bg-court-surface/30 p-12 text-center">
            <p className="font-mono text-court-muted text-sm tracking-wider">
              NO VERDICTS YET. BE THE FIRST.
            </p>
            <Link
              href="/courtroom"
              className="btn-neon inline-block mt-6 text-xs"
            >
              ENTER THE COURTROOM
            </Link>
          </div>
        )}

        {!error && !verdicts && (
          <div className="border border-court-border bg-court-surface/30 p-12 text-center">
            <p className="font-mono text-court-muted text-sm tracking-wider">
              QUERYING THE CHAIN…
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {verdicts?.map((v, i) => {
            const secAgo = Math.max(0, now - v.timestamp);
            return (
              <motion.div
                key={v.txHash}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.6), duration: 0.3 }}
                className={`border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 ${
                  v.isLegendary
                    ? "border-court-amber/60 bg-court-amber/[0.03] neon-box-amber"
                    : "border-court-border bg-court-surface/30"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {v.username ? (
                      <p className="font-mono text-court-text text-base truncate">
                        @{v.username}
                      </p>
                    ) : (
                      <p className="font-mono text-court-muted text-base">
                        {shortAddr(v.wallet)}
                      </p>
                    )}
                    {v.isLegendary && (
                      <span className="font-mono text-[9px] tracking-[0.2em] text-court-amber border border-court-amber/40 px-1.5 py-0.5">
                        LEGENDARY
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-court-muted text-[10px] tracking-wider">
                    {relTime(secAgo)} • CONFESSION {shortHash(v.confessionHash)}
                  </p>
                </div>

                <a
                  href={`${EXPLORER}/tx/${v.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] tracking-[0.2em] text-court-muted hover:text-[#00ff41] shrink-0"
                >
                  TX {shortHash(v.txHash)} ↗
                </a>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-16 flex items-center justify-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-court-border" />
          <p className="font-mono text-court-muted/40 text-[10px] tracking-[0.3em]">
            POWERED BY BDH
          </p>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-court-border" />
        </div>
      </div>
    </main>
  );
}
