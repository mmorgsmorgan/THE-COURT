"use client";

import { motion } from "framer-motion";
import { GlitchText } from "@/components/glitch-text";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00ff41]/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-court-red/[0.02] rounded-full blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        {/* Pre-title */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="font-mono text-court-muted text-xs tracking-[0.4em] mb-8"
        >
          RITUAL CHAIN • AI TRIBUNAL
        </motion.p>

        {/* Main title */}
        <GlitchText
          text="THE COURT IS NOW IN SESSION"
          className="text-3xl sm:text-5xl lg:text-6xl text-[#00ff41] neon-glow leading-tight mb-8"
        />

        {/* Subtitle lines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-col gap-1 mb-12"
        >
          {["One confession.", "One judgment.", "Three verdicts every 24 hours."].map(
            (line, i) => (
              <motion.p
                key={line}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.2, duration: 0.4 }}
                className="font-mono text-court-text/70 text-sm sm:text-base tracking-wider"
              >
                {line}
              </motion.p>
            )
          )}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <Link href="/courtroom">
            <button className="btn-neon text-base px-12 py-4 neon-pulse">
              ENTER THE COURTROOM
            </button>
          </Link>
          <Link
            href="/wall"
            className="font-mono text-court-muted hover:text-[#00ff41] text-xs tracking-[0.3em]"
          >
            VIEW THE WALL OF VERDICTS →
          </Link>
        </motion.div>

        {/* Bottom decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          className="mt-16 flex items-center gap-4"
        >
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-court-border" />
          <p className="font-mono text-court-muted/40 text-[10px] tracking-[0.3em]">
            POWERED BY BDH
          </p>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-court-border" />
        </motion.div>
      </div>
    </main>
  );
}
