"use client";

interface ChipProps {
  label: string;
  selected?: boolean;
  onToggle?: () => void;
  size?: "sm" | "md";
}

export function Chip({
  label,
  selected = false,
  onToggle,
  size = "md",
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        tap-target inline-flex items-center justify-center
        rounded-full border font-medium transition-colors duration-150
        ${size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-[14px]"}
        ${
          selected
            ? "border-primary bg-primary-light text-primary"
            : "border-border bg-white text-foreground hover:bg-gray-50"
        }
      `}
    >
      {label}
    </button>
  );
}
