"use client";

type Props = {
  value: string;
  onChange: (yyyymm: string) => void;
  disabled?: boolean;
};

export function MonthSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="billing-month" className="text-sm font-medium text-foreground">
        対象月
      </label>
      <input
        id="billing-month"
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
