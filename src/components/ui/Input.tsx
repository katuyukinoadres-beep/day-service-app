"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[14px] font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        className={`
          tap-target w-full rounded-xl border border-border bg-white
          px-4 py-3 text-[15px] text-foreground
          placeholder:text-sub/50
          focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
          disabled:bg-gray-50 disabled:text-sub
          ${error ? "border-danger" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[14px] font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full rounded-xl border border-border bg-white
          px-4 py-3 text-[15px] text-foreground
          placeholder:text-sub/50
          focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
          disabled:bg-gray-50 disabled:text-sub
          ${error ? "border-danger" : ""}
          ${className}
        `}
        rows={3}
        {...props}
      />
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
