"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 active:bg-primary/80",
  secondary: "bg-white text-foreground border border-border hover:bg-gray-50 active:bg-gray-100",
  danger: "bg-danger text-white hover:bg-danger/90 active:bg-danger/80",
  ghost: "bg-transparent text-sub hover:bg-gray-100 active:bg-gray-200",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        tap-target inline-flex items-center justify-center
        rounded-xl px-4 py-3 text-[15px] font-medium
        transition-colors duration-150
        disabled:opacity-50 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
