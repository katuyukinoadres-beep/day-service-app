"use client";

import { useState, type ReactNode } from "react";

interface CopyButtonProps {
  text: string | (() => string);
  label?: string;
  icon?: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

const variantStyles: Record<NonNullable<CopyButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-white hover:bg-primary/90 active:bg-primary/80",
  secondary:
    "bg-white text-foreground border border-border hover:bg-gray-50 active:bg-gray-100",
  ghost:
    "bg-transparent text-sub hover:bg-gray-100 active:bg-gray-200 border-0",
};

export function CopyButton({
  text,
  label = "コピー",
  icon,
  className = "",
  variant = "secondary",
  fullWidth = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    const payload = typeof text === "function" ? text() : text;
    if (!payload) {
      setError("コピー対象が空です");
      setTimeout(() => setError(null), 2000);
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        // フォールバック: 古いブラウザや非 HTTPS 環境用
        const ta = document.createElement("textarea");
        ta.value = payload;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("コピーに失敗しました");
      setTimeout(() => setError(null), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`tap-target inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${variantStyles[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      aria-label={label}
    >
      {copied ? (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
          コピーしました
        </>
      ) : error ? (
        <>⚠ {error}</>
      ) : (
        <>
          {icon ?? (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
              />
            </svg>
          )}
          {label}
        </>
      )}
    </button>
  );
}
