import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
}

export function Card({
  padding = true,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-border bg-white
        ${padding ? "p-4" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
