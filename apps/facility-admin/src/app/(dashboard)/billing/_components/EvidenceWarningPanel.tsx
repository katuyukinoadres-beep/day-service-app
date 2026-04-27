"use client";

import { useMemo, useState } from "react";
import {
  WARNING_LABELS,
  WARNING_SEVERITY,
  countWarningsByRule,
  type EvidenceWarning,
  type WarningRule,
} from "../_lib/evidenceChecks";

type Props = {
  warnings: EvidenceWarning[];
  selectedChildId: string | null;
};

const SEVERITY_BADGE: Record<"high" | "medium" | "low", string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-700",
};

export function EvidenceWarningPanel({ warnings, selectedChildId }: Props) {
  const [ruleFilter, setRuleFilter] = useState<WarningRule | "all">("all");

  const filtered = useMemo(() => {
    return warnings.filter((w) => {
      if (selectedChildId && w.childId !== selectedChildId) return false;
      if (ruleFilter !== "all" && w.rule !== ruleFilter) return false;
      return true;
    });
  }, [warnings, selectedChildId, ruleFilter]);

  const ruleCounts = useMemo(() => countWarningsByRule(warnings), [warnings]);

  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="border-b border-border p-4">
        <h2 className="text-base font-bold text-foreground">エビデンス警告</h2>
        <p className="mt-1 text-xs text-sub">
          請求エビデンスとして整合性が低いレコードを検出します。
          {selectedChildId && "（児童フィルタ適用中 — 表をクリックで解除）"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border p-4">
        <button
          onClick={() => setRuleFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            ruleFilter === "all" ? "bg-primary text-white" : "bg-gray-100 text-foreground hover:bg-gray-200"
          }`}
        >
          すべて ({warnings.length})
        </button>
        {(Object.keys(WARNING_LABELS) as WarningRule[]).map((rule) => (
          <button
            key={rule}
            onClick={() => setRuleFilter(rule)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              ruleFilter === rule ? "bg-primary text-white" : "bg-gray-100 text-foreground hover:bg-gray-200"
            }`}
          >
            <span
              className={`mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                SEVERITY_BADGE[WARNING_SEVERITY[rule]]
              }`}
            >
              {WARNING_SEVERITY[rule] === "high" ? "高" : WARNING_SEVERITY[rule] === "medium" ? "中" : "低"}
            </span>
            {WARNING_LABELS[rule]} ({ruleCounts[rule]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-sm text-sub">
          {warnings.length === 0 ? "警告はありません。整合性 OK 👌" : "条件に合致する警告はありません。"}
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-left text-xs font-medium text-sub">
              <tr>
                <th className="px-4 py-2">日付</th>
                <th className="px-4 py-2">児童名</th>
                <th className="px-4 py-2">警告種別</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((w, i) => (
                <tr key={`${w.childId}-${w.date}-${w.rule}-${i}`}>
                  <td className="px-4 py-2 tabular-nums">{w.date}</td>
                  <td className="px-4 py-2">{w.childName}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        SEVERITY_BADGE[WARNING_SEVERITY[w.rule]]
                      }`}
                    >
                      {WARNING_LABELS[w.rule]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
