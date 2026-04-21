"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@patto/shared/supabase/client";
import { buildRitalicoDailyReport, LITALICO_SOFT_LIMIT } from "@patto/shared";

type Row = {
  id: string;
  child_id: string;
  child_name: string;
  h_navi_user_code: string | null;
  recorder_display_name: string;
  submitted_at: string | null;
  transcribed_at: string | null;
  selectedActivityNames: string[];
  notes: string;
  aiText: string;
  copy_text: string;
  copy_chars: number;
};

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatJP(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function TranscribePage() {
  const [date, setDate] = useState<string>(getToday());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"awaiting" | "transcribed" | "draft" | "all">("awaiting");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("ログイン情報が取得できません。");
        setRows([]);
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("facility_id")
        .eq("id", user.id)
        .single();
      const facilityId = (profileRow as { facility_id: string } | null)?.facility_id;
      if (!facilityId) {
        setError("施設情報が取得できません。");
        setRows([]);
        return;
      }

      const { data: records, error: recErr } = await supabase
        .from("daily_records")
        .select(
          "id, child_id, date, activities, notes, ai_text, submitted_at, transcribed_at, paper_logged, recorded_by, children(name, h_navi_user_code), profiles!daily_records_recorded_by_fkey(display_name)"
        )
        .eq("facility_id", facilityId)
        .eq("date", date)
        .eq("paper_logged", false)
        .order("submitted_at", { ascending: true });

      if (recErr) {
        console.error(recErr);
        setError(recErr.message);
        setRows([]);
        return;
      }

      type JoinedChild = { name: string; h_navi_user_code: string | null };
      type Joined = {
        id: string;
        child_id: string;
        activities: string[] | null;
        notes: string | null;
        ai_text: string | null;
        submitted_at: string | null;
        transcribed_at: string | null;
        children: JoinedChild | JoinedChild[] | null;
        profiles: { display_name: string } | { display_name: string }[] | null;
      };

      const built: Row[] = (records as Joined[] | null ?? []).map((r) => {
        const child = Array.isArray(r.children) ? r.children[0] : r.children;
        const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        const recorderName = prof?.display_name ?? "";
        const selectedActivityNames = r.activities ?? [];
        const notes = r.notes ?? "";
        const aiText = r.ai_text ?? "";
        const copy_text = buildRitalicoDailyReport({
          recorderName,
          selectedActivityNames,
          notes,
          aiText,
        });
        return {
          id: r.id,
          child_id: r.child_id,
          child_name: child?.name ?? "(不明)",
          h_navi_user_code: child?.h_navi_user_code ?? null,
          recorder_display_name: recorderName,
          submitted_at: r.submitted_at,
          transcribed_at: r.transcribed_at,
          selectedActivityNames,
          notes,
          aiText,
          copy_text,
          copy_chars: copy_text.length,
        };
      });

      setRows(built);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "all") return true;
      if (filter === "awaiting") return r.submitted_at !== null && r.transcribed_at === null;
      if (filter === "transcribed") return r.transcribed_at !== null;
      if (filter === "draft") return r.submitted_at === null;
      return true;
    });
  }, [rows, filter]);

  const counts = useMemo(
    () => ({
      awaiting: rows.filter((r) => r.submitted_at !== null && r.transcribed_at === null).length,
      transcribed: rows.filter((r) => r.transcribed_at !== null).length,
      draft: rows.filter((r) => r.submitted_at === null).length,
      total: rows.length,
    }),
    [rows]
  );

  const handleCopy = async (row: Row) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row.copy_text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = row.copy_text;
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((cur) => (cur === row.id ? null : cur)), 1800);
    } catch (e) {
      console.error(e);
      alert("クリップボードコピーに失敗しました");
    }
  };

  const handleToggleTranscribed = async (row: Row) => {
    setBusyId(row.id);
    try {
      const supabase = createClient();
      const next = row.transcribed_at === null ? new Date().toISOString() : null;
      const { error: updErr } = await supabase
        .from("daily_records")
        .update({ transcribed_at: next })
        .eq("id", row.id);
      if (updErr) {
        alert(`更新に失敗しました: ${updErr.message}`);
        return;
      }
      setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, transcribed_at: next } : r)));
    } finally {
      setBusyId(null);
    }
  };

  const openHnavi = () => {
    window.open(
      "https://managing.h-navi.jp/communication-result-publish?facilityCode=3635437893968734208&provisionServiceCategoryCode=3635437894123926016",
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">リタリコ転記</h1>
          <p className="text-[12px] text-sub">
            ぱっと記録の「書き終えて次へ」でマークされた記録を h-navi 連絡帳に転記する代表者向け画面。
          </p>
        </div>
        <button
          type="button"
          onClick={openHnavi}
          className="tap-target rounded-lg border border-primary bg-white px-3 py-2 text-[13px] font-medium text-primary hover:bg-primary/5"
        >
          h-navi を別タブで開く ↗
        </button>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-3">
        <label className="text-[13px] font-medium text-foreground">
          提供日:
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ml-2 rounded-md border border-border px-2 py-1 text-[13px]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1 text-[12px]">
          {[
            { key: "awaiting" as const, label: `未転記（${counts.awaiting}）`, color: "amber" },
            { key: "transcribed" as const, label: `転記済み（${counts.transcribed}）`, color: "emerald" },
            { key: "draft" as const, label: `下書き（${counts.draft}）`, color: "gray" },
            { key: "all" as const, label: `すべて（${counts.total}）`, color: "gray" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 font-medium ${
                filter === f.key
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-sub hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[13px] text-sub">読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-border bg-white p-4 text-center text-[13px] text-sub">
          表示する記録がありません。
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((row) => {
            const overLimit = row.copy_chars > LITALICO_SOFT_LIMIT;
            const status =
              row.transcribed_at !== null
                ? { label: "転記済み", cls: "bg-emerald-100 text-emerald-800" }
                : row.submitted_at !== null
                  ? { label: "未転記", cls: "bg-amber-100 text-amber-800" }
                  : { label: "下書き", cls: "bg-gray-100 text-gray-600" };
            return (
              <li key={row.id} className="rounded-xl border border-border bg-white p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${status.cls}`}>
                      {status.label}
                    </span>
                    <span className="text-[15px] font-semibold text-foreground">{row.child_name}</span>
                    {row.h_navi_user_code ? (
                      <span
                        className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-800"
                        title="児童管理番号（h-navi userCode）"
                      >
                        #{row.h_navi_user_code}
                      </span>
                    ) : (
                      <span
                        className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                        title="児童管理番号が未入力 — 児童編集画面から設定してください"
                      >
                        管理番号 未設定
                      </span>
                    )}
                    <span className="text-[12px] text-sub">記録者: {row.recorder_display_name || "(未設定)"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-sub">
                    <span>
                      提出: {formatJP(row.submitted_at)} / 転記: {formatJP(row.transcribed_at)}
                    </span>
                    <span className={overLimit ? "font-medium text-amber-700" : ""}>
                      {row.copy_chars}/{LITALICO_SOFT_LIMIT}字
                    </span>
                  </div>
                </div>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-gray-50 p-2 text-[12px] text-foreground">
                  {row.copy_text || "(内容なし)"}
                </pre>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(row)}
                    disabled={!row.copy_text}
                    className={`tap-target rounded-lg px-3 py-2 text-[13px] font-medium text-white transition-colors disabled:opacity-50 ${
                      copiedId === row.id ? "bg-emerald-600" : "bg-primary hover:bg-primary/90"
                    }`}
                  >
                    {copiedId === row.id ? "コピーしました ✓" : "転記用コピー"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleTranscribed(row)}
                    disabled={busyId === row.id || row.submitted_at === null}
                    title={
                      row.submitted_at === null
                        ? "下書き状態の記録はマークできません"
                        : row.transcribed_at === null
                          ? "h-navi 転記完了をマーク"
                          : "転記済みマークを解除"
                    }
                    className="tap-target rounded-lg border border-border bg-white px-3 py-2 text-[13px] font-medium text-foreground hover:bg-gray-50 disabled:opacity-50"
                  >
                    {busyId === row.id
                      ? "更新中..."
                      : row.transcribed_at === null
                        ? "h-navi 転記完了をマーク"
                        : "転記済み解除"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
