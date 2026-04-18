"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Textarea } from "@/components/ui/Input";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { CopyButton } from "@/components/CopyButton";
import { useProfile } from "@/lib/useProfile";
import type {
  Child,
  Phrase,
  DailyRecord,
  QuickTemplate,
  ActivityItem,
  DailyRecordActivity,
} from "@patto/shared/types";

const MOODS = [
  { value: "good" as const, emoji: "😊", label: "良好" },
  { value: "neutral" as const, emoji: "😐", label: "普通" },
  { value: "bad" as const, emoji: "😢", label: "不調" },
];

const PICKUP_METHODS = ["送迎車", "保護者送迎", "自力通所", "その他"];

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCurrentTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildRitalicoDailyReport(params: {
  date: string;
  childName: string;
  arrivalTime: string;
  departureTime: string;
  recorderName: string;
  moodLabel: string;
  selectedActivityNames: string[];
  notes: string;
  aiText: string;
  pickupMethod: string;
}): string {
  const {
    date,
    childName,
    arrivalTime,
    departureTime,
    recorderName,
    moodLabel,
    selectedActivityNames,
    notes,
    aiText,
    pickupMethod,
  } = params;

  // NOTE: 記録フレーズ (phrases) と 活動中のトピックス (topics) は
  // AI への入力ヒントであり最終出力ではないので意図的に含めない

  const lines: string[] = [];
  lines.push(`【実施日】 ${date}`);
  lines.push(`【児童名】 ${childName}`);
  const timeRange =
    arrivalTime && departureTime
      ? `${arrivalTime} 〜 ${departureTime}`
      : arrivalTime
        ? `${arrivalTime} 〜`
        : departureTime
          ? `〜 ${departureTime}`
          : "";
  if (timeRange) lines.push(`【サービス提供時間】 ${timeRange}`);
  if (recorderName) lines.push(`【担当者】 ${recorderName}`);
  lines.push(`【気分】 ${moodLabel}`);

  if (selectedActivityNames.length > 0) {
    lines.push("");
    lines.push("【活動内容】");
    for (const name of selectedActivityNames) {
      lines.push(`・${name}`);
    }
  }

  if (notes.trim()) {
    lines.push("");
    lines.push("【特記事項】");
    lines.push(notes.trim());
  }

  if (aiText.trim()) {
    lines.push("");
    lines.push("【支援記録まとめ】");
    lines.push(aiText.trim());
  }

  if (pickupMethod) {
    lines.push("");
    lines.push(`【送迎方法】 ${pickupMethod}`);
  }

  return lines.join("\n");
}

export default function RecordPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;
  const { profile } = useProfile();

  const [child, setChild] = useState<Child | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [topicsTemplates, setTopicsTemplates] = useState<QuickTemplate[]>([]);
  const [notesTemplates, setNotesTemplates] = useState<QuickTemplate[]>([]);
  const [existingRecord, setExistingRecord] = useState<DailyRecord | null>(null);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [allRecords, setAllRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [mood, setMood] = useState<"good" | "neutral" | "bad" | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  // key: activity_item_id, value: detail text (空文字＝選択だが詳細なし or 詳細欄なし)
  const [itemSelections, setItemSelections] = useState<Record<string, string>>(
    {}
  );
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [topics, setTopics] = useState("");
  const [notes, setNotes] = useState("");
  const [aiText, setAiText] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [pickupMethod, setPickupMethod] = useState("");

  const today = getToday();

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const [
        childRes,
        phrasesRes,
        recordRes,
        childrenRes,
        recordsRes,
        templatesRes,
        activityItemsRes,
      ] = await Promise.all([
        supabase.from("children").select("*").eq("id", childId).single(),
        supabase
          .from("phrase_bank")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("daily_records")
          .select("*")
          .eq("child_id", childId)
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("children")
          .select("*")
          .eq("is_active", true)
          .order("name_kana", { ascending: true }),
        supabase
          .from("daily_records")
          .select("*")
          .eq("date", today),
        supabase
          .from("quick_templates")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("activity_items")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      setChild(childRes.data as Child | null);
      setPhrases((phrasesRes.data as Phrase[]) ?? []);
      setAllChildren((childrenRes.data as Child[]) ?? []);
      setAllRecords((recordsRes.data as DailyRecord[]) ?? []);
      const allTemplates = (templatesRes.data as QuickTemplate[]) ?? [];
      setTopicsTemplates(allTemplates.filter((t) => t.field_type === "topics"));
      setNotesTemplates(allTemplates.filter((t) => t.field_type === "notes"));
      setActivityItems((activityItemsRes.data as ActivityItem[]) ?? []);

      // 既存記録があれば復元
      const existingData = recordRes.data as DailyRecord | null;
      if (existingData) {
        setExistingRecord(existingData);
        setMood(existingData.mood);
        setSelectedPhrases(existingData.phrases);

        // 既存記録に紐づく活動項目選択を復元
        const { data: draRaw } = await supabase
          .from("daily_record_activities")
          .select("*")
          .eq("daily_record_id", existingData.id);
        const dra = (draRaw as DailyRecordActivity[] | null) ?? [];
        const nextSelections: Record<string, string> = {};
        for (const row of dra) {
          nextSelections[row.activity_item_id] = row.detail ?? "";
        }
        setItemSelections(nextSelections);
        setTopics(existingData.topics ?? "");
        // 後方互換: topics/notes が未設定かつ memo がある場合、notes に移行表示
        setNotes(
          existingData.notes ??
            (!existingData.topics && existingData.memo
              ? existingData.memo
              : "")
        );
        setAiText(existingData.ai_text ?? "");
        setArrivalTime(existingData.arrival_time ?? "");
        setDepartureTime(existingData.departure_time ?? "");
        setPickupMethod(existingData.pickup_method ?? "");
      } else {
        setArrivalTime(getCurrentTime());
      }
      setLoading(false);
    };
    fetchData();
  }, [childId, today]);

  const toggleActivityItem = (itemId: string) => {
    setItemSelections((prev) => {
      if (itemId in prev) {
        const { [itemId]: _removed, ...rest } = prev;
        void _removed;
        return rest;
      }
      return { ...prev, [itemId]: "" };
    });
  };

  const setActivityDetail = (itemId: string, detail: string) => {
    setItemSelections((prev) => ({ ...prev, [itemId]: detail }));
  };

  const togglePhrase = (phrase: string) => {
    setSelectedPhrases((prev) =>
      prev.includes(phrase)
        ? prev.filter((p) => p !== phrase)
        : [...prev, phrase]
    );
  };

  const appendToField = (
    current: string,
    setter: (v: string) => void,
    text: string
  ) => {
    const trimmed = current.trim();
    setter(trimmed.length === 0 ? text : `${current}\n${text}`);
  };

  // 選択中の活動項目名 (+詳細) を文字列配列として構築（AI / legacy 保存用）
  const selectedActivityNames: string[] = activityItems
    .filter((item) => item.id in itemSelections)
    .map((item) => {
      const detail = itemSelections[item.id]?.trim();
      return detail ? `${item.name}（${detail}）` : item.name;
    });

  const handleAIGenerate = async () => {
    if (!child) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: child.name,
          birthDate: child.birth_date,
          school: child.school,
          grade: child.grade,
          mood,
          activities: selectedActivityNames,
          phrases: selectedPhrases,
          topics,
          notes,
        }),
      });
      if (res.ok) {
        const { text } = await res.json();
        setAiText(text);
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error ?? "不明なエラー";
        alert(`AI文章生成に失敗しました: ${msg}`);
      }
    } catch {
      alert("AI文章生成に失敗しました。ネットワークを確認してください。");
    }
    setGenerating(false);
  };

  // 児童の目標に関連するフレーズを優先表示
  const sortedPhrases = [...phrases].sort((a, b) => {
    if (!child) return 0;
    const aMatch = a.domain_tags.some((tag) =>
      child.domain_tags.includes(tag)
    );
    const bMatch = b.domain_tags.some((tag) =>
      child.domain_tags.includes(tag)
    );
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  // カテゴリでグループ化
  const phrasesByCategory = sortedPhrases.reduce<Record<string, Phrase[]>>(
    (acc, phrase) => {
      if (!acc[phrase.category]) acc[phrase.category] = [];
      acc[phrase.category].push(phrase);
      return acc;
    },
    {}
  );

  const handleSave = async () => {
    if (!child) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("facility_id")
      .eq("id", user.id)
      .single();
    const profile = profileData as { facility_id: string } | null;

    if (!profile) {
      setSaving(false);
      return;
    }

    const recordData = {
      facility_id: profile.facility_id,
      child_id: childId,
      date: today,
      mood,
      // legacy カラム: 後方互換のため活動名（+詳細）を text[] にも書いておく。表示系が連結テーブル対応するまでの橋渡し
      activities: selectedActivityNames,
      phrases: selectedPhrases,
      topics: topics.trim() || null,
      notes: notes.trim() || null,
      // memo は新フォーマット移行のため null クリア
      memo: null,
      ai_text: aiText.trim() || null,
      arrival_time: arrivalTime || null,
      departure_time: departureTime || null,
      pickup_method: pickupMethod || null,
      recorded_by: user.id,
    };

    let savedRecordId: string | null = null;
    if (existingRecord) {
      const { data: updated } = await supabase
        .from("daily_records")
        .update(recordData)
        .eq("id", existingRecord.id)
        .select("id")
        .single();
      savedRecordId = (updated as { id: string } | null)?.id ?? existingRecord.id;
    } else {
      const { data: inserted } = await supabase
        .from("daily_records")
        .insert(recordData)
        .select("id")
        .single();
      savedRecordId = (inserted as { id: string } | null)?.id ?? null;
    }

    // 活動項目連結テーブルを delete → insert で同期
    if (savedRecordId) {
      await supabase
        .from("daily_record_activities")
        .delete()
        .eq("daily_record_id", savedRecordId);

      const rows = Object.entries(itemSelections).map(([activityItemId, detail]) => ({
        daily_record_id: savedRecordId as string,
        activity_item_id: activityItemId,
        detail: detail.trim() || null,
      }));
      if (rows.length > 0) {
        await supabase.from("daily_record_activities").insert(rows);
      }
    }

    // 次の未記録児童へ自動遷移
    const recordedIds = new Set(allRecords.map((r) => r.child_id));
    recordedIds.add(childId); // 今保存したものを追加
    const nextChild = allChildren.find((c) => !recordedIds.has(c.id));

    if (nextChild) {
      router.replace(`/record/${nextChild.id}`);
    } else {
      router.push("/");
    }
    router.refresh();
  };

  if (loading || !child) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="tap-target flex items-center justify-center rounded-lg p-1 hover:bg-gray-100"
            aria-label="戻る"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-white text-[14px] font-bold shrink-0"
            style={{ backgroundColor: child.icon_color }}
          >
            {child.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-foreground truncate">
              {child.name}
            </h1>
          </div>
          {existingRecord && (
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[12px] text-primary font-medium">
              編集中
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-6 px-4 py-4 pb-8">
        {/* 来所時刻 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[14px] font-medium text-foreground">
              来所時刻
            </label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="tap-target mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px]"
            />
          </div>
          <div className="flex-1">
            <label className="text-[14px] font-medium text-foreground">
              退所時刻
            </label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="tap-target mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px]"
            />
          </div>
        </div>

        {/* 気分 */}
        <div>
          <label className="text-[14px] font-medium text-foreground">
            きょうの気分
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(m.value)}
                className={`
                  tap-target flex flex-col items-center gap-1 rounded-2xl border-2 py-3
                  transition-colors duration-150
                  ${
                    mood === m.value
                      ? "border-primary bg-primary-light"
                      : "border-border bg-white"
                  }
                `}
              >
                <span className="text-[28px]">{m.emoji}</span>
                <span className="text-[13px] font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 活動内容（活動マスタから） */}
        <div>
          <label className="text-[14px] font-medium text-foreground">
            活動内容
          </label>
          {activityItems.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-border bg-white px-3 py-4 text-center text-[13px] text-sub">
              活動項目が登録されていません。
              <br />
              管理者は「設定 &gt; 活動マスタ管理」から項目を追加してください。
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {activityItems.filter((i) => i.is_active).map((item) => {
                const selected = item.id in itemSelections;
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleActivityItem(item.id)}
                      className={`
                        tap-target w-full rounded-xl border px-3 py-2.5 text-left text-[14px]
                        transition-colors duration-150
                        ${
                          selected
                            ? "border-primary bg-primary-light text-primary font-medium"
                            : "border-border bg-white text-foreground"
                        }
                      `}
                    >
                      <span className="mr-1.5">{selected ? "☑" : "☐"}</span>
                      {item.name}
                    </button>
                    {selected && item.has_detail_field && (
                      <div className="mt-1.5 pl-4">
                        <Textarea
                          value={itemSelections[item.id] ?? ""}
                          onChange={(e) =>
                            setActivityDetail(item.id, e.target.value)
                          }
                          placeholder="詳細内容を入力（任意）"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フレーズ */}
        <div>
          <label className="text-[14px] font-medium text-foreground">
            記録フレーズ
          </label>
          {Object.entries(phrasesByCategory).map(([category, catPhrases]) => (
            <div key={category} className="mt-3">
              <p className="text-[12px] font-medium text-sub mb-1.5">
                {category}
              </p>
              <div className="flex flex-col gap-1.5">
                {catPhrases.map((phrase) => {
                  const isSelected = selectedPhrases.includes(phrase.text);
                  const isRelevant =
                    child.domain_tags.length > 0 &&
                    phrase.domain_tags.some((tag) =>
                      child.domain_tags.includes(tag)
                    );

                  return (
                    <button
                      key={phrase.id}
                      type="button"
                      onClick={() => togglePhrase(phrase.text)}
                      className={`
                        tap-target w-full rounded-xl border px-3 py-2.5 text-left text-[14px]
                        transition-colors duration-150
                        ${
                          isSelected
                            ? "border-primary bg-primary-light text-primary font-medium"
                            : isRelevant
                              ? "border-accent/30 bg-accent-light text-foreground"
                              : "border-border bg-white text-foreground"
                        }
                      `}
                    >
                      {isSelected && "✓ "}
                      {phrase.text}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 活動中のトピックス（紙フォーム準拠） */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[14px] font-medium text-foreground">
              活動中のトピックス
            </label>
            <VoiceInputButton
              label="音声入力"
              onAppend={(t) => appendToField(topics, setTopics, t)}
            />
          </div>
          <p className="text-[12px] text-sub mb-1.5">
            活動中の様子・エピソード
          </p>
          {topicsTemplates.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {topicsTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => appendToField(topics, setTopics, t.text)}
                  className="tap-target rounded-full border border-accent/30 bg-accent-light px-3 py-1 text-[13px] text-foreground active:bg-accent/10"
                >
                  + {t.text.length > 24 ? `${t.text.slice(0, 24)}…` : t.text}
                </button>
              ))}
            </div>
          )}
          <Textarea
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="例: 宿題のあと自分からお友達に声をかけていました"
          />
        </div>

        {/* 特記事項（紙フォーム準拠） */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[14px] font-medium text-foreground">
              特記事項
            </label>
            <VoiceInputButton
              label="音声入力"
              onAppend={(t) => appendToField(notes, setNotes, t)}
            />
          </div>
          <p className="text-[12px] text-sub mb-1.5">
            異常事態・重要な気づき・連絡事項
          </p>
          {notesTemplates.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {notesTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => appendToField(notes, setNotes, t.text)}
                  className="tap-target rounded-full border border-accent/30 bg-accent-light px-3 py-1 text-[13px] text-foreground active:bg-accent/10"
                >
                  + {t.text.length > 24 ? `${t.text.slice(0, 24)}…` : t.text}
                </button>
              ))}
            </div>
          )}
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例: 午後から熱っぽさあり、保護者へ連絡予定"
          />
        </div>

        {/* 本日の支援記録まとめ */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[14px] font-medium text-foreground">本日の支援記録まとめ</label>
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  生成中...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                  </svg>
                  AIで下書き作成
                  <span className="text-[10px] opacity-75">v2.0</span>
                </>
              )}
            </button>
          </div>
          <Textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="直接入力、またはAIで下書きを作成できます"
          />
          <div className="mt-2 flex justify-end">
            <CopyButton
              label="記録まとめだけコピー"
              variant="secondary"
              text={() => aiText.trim()}
            />
          </div>
        </div>

        {/* 送迎方法 */}
        <div>
          <label className="text-[14px] font-medium text-foreground">
            送迎方法
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PICKUP_METHODS.map((method) => (
              <Chip
                key={method}
                label={method}
                selected={pickupMethod === method}
                onToggle={() =>
                  setPickupMethod(pickupMethod === method ? "" : method)
                }
              />
            ))}
          </div>
        </div>

        {/* リタリコ等への転記用まるごとコピー */}
        <div className="rounded-xl border border-border bg-white p-3">
          <p className="text-[13px] font-medium text-foreground mb-1">
            リタリコ等への転記用
          </p>
          <p className="text-[11px] text-sub mb-2">
            現在の入力内容を日報フォーマットで一括コピーします
          </p>
          <CopyButton
            label="日報まるごとコピー"
            variant="primary"
            fullWidth
            text={() =>
              buildRitalicoDailyReport({
                date: today,
                childName: child.name,
                arrivalTime,
                departureTime,
                recorderName: profile?.display_name ?? "",
                moodLabel:
                  MOODS.find((m) => m.value === mood)?.label ?? "未選択",
                selectedActivityNames,
                notes,
                aiText,
                pickupMethod,
              })
            }
          />
        </div>

        {/* 保存 */}
        <Button onClick={handleSave} fullWidth disabled={saving}>
          {saving
            ? "保存中..."
            : existingRecord
              ? "更新する"
              : "保存して次へ"}
        </Button>
      </div>
    </div>
  );
}
