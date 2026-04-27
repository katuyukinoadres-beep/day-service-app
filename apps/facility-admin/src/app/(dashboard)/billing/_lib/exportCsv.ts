import type { ChildMonthlySummary } from "./aggregateMonth";
import type { EvidenceWarning } from "./evidenceChecks";
import { WARNING_LABELS } from "./evidenceChecks";

const BOM = "﻿";

function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = BOM + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAttendanceCsv(yyyymm: string, summaries: ChildMonthlySummary[]): void {
  const rows: string[][] = [
    ["児童名", "出席日数", "記録完了数", "警告件数"],
    ...summaries.map((s) => [
      s.childName,
      s.presentDays,
      s.recordedDays,
      s.warningCount,
    ].map(String)),
  ];
  downloadCsv(`monthly_attendance_${yyyymm}.csv`, rows);
}

export function exportEvidenceWarningsCsv(
  yyyymm: string,
  warnings: EvidenceWarning[]
): void {
  const rows: string[][] = [
    ["日付", "児童名", "警告種別"],
    ...warnings.map((w) => [w.date, w.childName, WARNING_LABELS[w.rule]]),
  ];
  downloadCsv(`evidence_warnings_${yyyymm}.csv`, rows);
}
