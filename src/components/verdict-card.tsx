"use client";

import { forwardRef } from "react";
import type { Judgment } from "@/lib/judge";

interface VerdictCardProps {
  username: string;
  avatarUrl?: string;
  judgment: Judgment;
  timestamp?: string;
}

function proxiedAvatar(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=200&h=200&fit=cover&output=png`;
}

export const VerdictCard = forwardRef<HTMLDivElement, VerdictCardProps>(
  function VerdictCard({ username, avatarUrl, judgment, timestamp }, ref) {
    const time = timestamp || new Date().toISOString();
    const displayDate = new Date(time).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const safeAvatar = proxiedAvatar(avatarUrl);

    return (
      <div
        ref={ref}
        className="verdict-card-bg border border-court-border relative overflow-hidden"
        style={{ width: 600, minHeight: 340, padding: 0 }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
          }}
        />

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-60" />

        {/* Legendary banner */}
        {judgment.isLegendary && (
          <div className="bg-court-red/10 border-b border-court-red/30 py-1.5 px-6">
            <p className="font-mono text-court-red text-xs tracking-[0.3em] text-center">
              ★ LEGENDARY VERDICT ★
            </p>
          </div>
        )}

        <div className="px-8 py-6 relative z-20">
          {/* Header */}
          <p className="font-mono text-court-muted text-[10px] tracking-[0.3em] mb-4">
            THE COURTROOM — OFFICIAL VERDICT
          </p>

          {/* Intro */}
          <h2
            className={`font-heading text-xl mb-6 ${
              judgment.isLegendary
                ? "text-court-red neon-glow-red"
                : "text-[#00ff41] neon-glow"
            }`}
          >
            {judgment.intro}
          </h2>

          {/* Identity row */}
          <div className="flex items-center gap-4 mb-6">
            {/* PFP */}
            <div
              className={`w-14 h-14 rounded-full overflow-hidden border-2 shrink-0 ${
                judgment.isLegendary
                  ? "border-court-red/60"
                  : "border-[#00ff41]/40"
              }`}
            >
              {safeAvatar ? (
                <img
                  src={safeAvatar}
                  alt={username}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full bg-court-surface flex items-center justify-center font-mono text-court-muted text-lg">
                  ?
                </div>
              )}
            </div>
            <div>
              <p className="font-mono text-court-text text-base">
                @{username}
              </p>
              <p className="font-mono text-court-muted text-xs">
                DEFENDANT
              </p>
            </div>
          </div>

          {/* Sentence */}
          <div className="border-l-2 border-[#00ff41]/40 pl-4 mb-4">
            <p className="font-mono text-court-muted text-[10px] tracking-[0.2em] mb-1">
              SENTENCE
            </p>
            <p className="font-body text-court-text text-base leading-relaxed">
              &ldquo;{judgment.sentence}&rdquo;
            </p>
          </div>

          {/* Comment */}
          <div className="border-l-2 border-court-muted/30 pl-4 mb-5">
            <p className="font-mono text-court-muted text-[10px] tracking-[0.2em] mb-1">
              ADDITIONAL NOTES
            </p>
            <p className="font-body text-court-muted text-sm italic">
              &ldquo;{judgment.comment}&rdquo;
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-court-border pt-3">
            <p className="font-mono text-court-muted text-[10px] tracking-wider">
              {displayDate}
            </p>
            <p className="font-mono text-[#00ff41]/40 text-[10px] tracking-[0.2em]">
              RITUAL CHAIN
            </p>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00ff41]/30 to-transparent" />
      </div>
    );
  }
);
