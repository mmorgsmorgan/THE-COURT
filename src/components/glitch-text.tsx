"use client";

import { motion } from "framer-motion";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
}

export function GlitchText({
  text,
  className = "",
  as: Tag = "h1",
}: GlitchTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Tag
        className={`glitch-text font-heading ${className}`}
        data-text={text}
      >
        {text}
      </Tag>
    </motion.div>
  );
}
