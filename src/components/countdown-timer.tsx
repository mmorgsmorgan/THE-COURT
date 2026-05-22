"use client";

import { useEffect, useRef, useState } from "react";

interface CountdownTimerProps {
  targetTime: Date;
  onComplete?: () => void;
}

export function CountdownTimer({ targetTime, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [done, setDone] = useState(false);
  const firedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    firedRef.current = false;

    const tick = () => {
      const diff = targetTime.getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setDone(true);
        clearInterval(interval);
        if (!firedRef.current) {
          firedRef.current = true;
          onCompleteRef.current?.();
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (done) {
    return (
      <div className="font-mono text-[#00ff41] text-3xl sm:text-5xl neon-glow tracking-widest">
        READY
      </div>
    );
  }

  return (
    <div className="font-mono text-court-red text-3xl sm:text-5xl neon-glow-red tracking-widest">
      {timeLeft}
    </div>
  );
}
