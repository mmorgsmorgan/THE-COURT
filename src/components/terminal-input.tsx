"use client";

import { useState } from "react";

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  onSubmit?: () => void;
}

export function TerminalInput({
  value,
  onChange,
  placeholder = "ENTER COMMAND...",
  maxLength = 280,
  multiline = false,
  onSubmit,
}: TerminalInputProps) {
  const [focused, setFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const commonProps = {
    value,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onKeyDown: handleKeyDown,
    maxLength,
    placeholder,
    spellCheck: false,
    autoComplete: "off",
    className: `w-full bg-transparent outline-none font-mono text-[#00ff41] placeholder:text-[#00ff41]/30 text-sm sm:text-base`,
  };

  return (
    <div
      className={`relative border transition-all duration-300 ${
        focused
          ? "border-[#00ff41]/60 neon-box"
          : "border-court-border hover:border-[#00ff41]/30"
      } bg-court-bg/80 backdrop-blur-sm`}
    >
      <div className="flex items-start gap-2 p-4">
        <span className="font-mono text-[#00ff41]/50 text-sm select-none mt-0.5 shrink-0">
          {">"}_
        </span>
        {multiline ? (
          <textarea
            {...commonProps}
            rows={4}
            className={`${commonProps.className} resize-none`}
          />
        ) : (
          <input type="text" {...commonProps} />
        )}
        {focused && value.length === 0 && (
          <span className="absolute right-4 top-4 font-mono text-[#00ff41] cursor-blink">
            █
          </span>
        )}
      </div>
      {maxLength && (
        <div className="px-4 pb-2 flex justify-end">
          <span
            className={`font-mono text-xs ${
              value.length > maxLength * 0.9
                ? "text-court-red"
                : "text-court-muted"
            }`}
          >
            {value.length}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
}
