"use client";

import type { ChildMonthlySummary } from "../_lib/aggregateMonth";

type Props = {
  summaries: ChildMonthlySummary[];
  selectedChildId: string | null;
  onSelectChild: (childId: string | null) => void;
};

export function ChildSummaryTable({ summaries, selectedChildId, onSelectChild }: Props) {
  if (summaries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 text-center text-sm text-sub">
        この月のサービス提供データはありません。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium text-sub">
          <tr>
            <th className="px-4 py-3">児童名</th>
            <th className="px-4 py-3 text-right">出席日数</th>
            <th className="px-4 py-3 text-right">記録完了数</th>
            <th className="px-4 py-3 text-right">警告</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {summaries.map((s) => {
            const isSelected = selectedChildId === s.childId;
            return (
              <tr
                key={s.childId}
                onClick={() => onSelectChild(isSelected ? null : s.childId)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10" : "hover:bg-gray-50"
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: s.iconColor }}
                    />
                    <span className="font-medium text-foreground">{s.childName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{s.presentDays}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.recordedDays}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {s.warningCount > 0 ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      {s.warningCount}
                    </span>
                  ) : (
                    <span className="text-sub">0</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
