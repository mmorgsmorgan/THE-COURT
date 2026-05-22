"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const MESSAGES = [
  "ANALYZING CRIMINAL ACTIVITY...",
  "CONSULTING PRODUCTIVITY COUNCIL...",
  "REVIEWING INTERNET HISTORY...",
  "CALCULATING PUNISHMENT...",
  "CROSS-REFERENCING DEGENERACY INDEX...",
  "SCANNING BLOCKCHAIN VIOLATIONS...",
];

interface ScanAnimationProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function ScanAnimation({
  onComplete,
  minDuration = 3000,
}: ScanAnimationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 800);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 8 + 2;
      });
    }, 200);

    const timeout = setTimeout(() => {
      onCompleteRef.current?.();
    }, minDuration);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [minDuration]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-8 py-16 flicker"
    >
      {/* Scanning icon */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full"
      />

      {/* Status message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="font-mono text-[#00ff41] text-sm sm:text-base tracking-wider text-center neon-glow"
        >
          {MESSAGES[currentIndex]}
        </motion.p>
      </AnimatePresence>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-court-border overflow-hidden">
        <motion.div
          className="h-full bg-[#00ff41]"
          style={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>

      <p className="font-mono text-court-muted text-xs tracking-widest">
        {Math.min(Math.round(progress), 100)}% COMPLETE
      </p>
    </motion.div>
  );
}
