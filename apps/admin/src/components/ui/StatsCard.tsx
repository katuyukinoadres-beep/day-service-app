"use client";

import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}

export function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div
      className="rounded-lg bg-white shadow-sm border border-border overflow-hidden"
      style={{ borderTopWidth: 4, borderTopColor: color }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-sm text-sub">{title}</p>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
