"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { DOMAIN_TAGS } from "@patto/shared/constants";

const ICON_COLORS = [
  "#1B6B4A", "#E8913A", "#3B82F6", "#8B5CF6",
  "#EC4899", "#EF4444", "#14B8A6", "#F59E0B",
];

export default function NewChildPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    name_kana: "",
    birth_date: "",
    school: "",
    grade: "",
    icon_color: ICON_COLORS[0],
    goals: [""],
    domain_tags: [] as string[],
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDomainTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      domain_tags: prev.domain_tags.includes(tag)
        ? prev.domain_tags.filter((t) => t !== tag)
        : [...prev.domain_tags, tag],
    }));
  };

  const updateGoal = (index: number, value: string) => {
    setForm((prev) => {
      const goals = [...prev.goals];
      goals[index] = value;
      return { ...prev, goals };
    });
  };

  const addGoal = () => {
    setForm((prev) => ({ ...prev, goals: [...prev.goals, ""] }));
  };

  const removeGoal = (index: number) => {
    setForm((prev) => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");

    const supabase = createClient();

    // 現在のユーザーのfacility_idを取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインしていません。再ログインしてください。");
      setSaving(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("facility_id")
      .eq("id", user.id)
      .single();
    const profile = profileData as { facility_id: string } | null;

    if (!profile) {
      setError("プロフィールが見つかりません: " + (profileError?.message ?? ""));
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("children").insert({
      facility_id: profile.facility_id,
      name: form.name.trim(),
      name_kana: form.name_kana.trim() || null,
      birth_date: form.birth_date || null,
      school: form.school.trim() || null,
      grade: form.grade.trim() || null,
      icon_color: form.icon_color,
      goals: form.goals.filter((g) => g.trim()),
      domain_tags: form.domain_tags,
    });

    if (insertError) {
      setError("児童の登録に失敗しました: " + insertError.message);
      setSaving(false);
      return;
    }

    router.push("/children");
    router.refresh();
    setSaving(false);
  };

  return (
    <div>
      <Header title="児童登録" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
        {/* 基本情報 */}
        <Input
          label="氏名 *"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="山田 太郎"
        />

        <Input
          label="ふりがな"
          value={form.name_kana}
          onChange={(e) => updateField("name_kana", e.target.value)}
          placeholder="やまだ たろう"
        />

        <Input
          label="生年月日"
          type="date"
          value={form.birth_date}
          onChange={(e) => updateField("birth_date", e.target.value)}
        />

        <Input
          label="学校"
          value={form.school}
          onChange={(e) => updateField("school", e.target.value)}
          placeholder="○○小学校"
        />

        <Input
          label="学年"
          value={form.grade}
          onChange={(e) => updateField("grade", e.target.value)}
          placeholder="小3"
        />

        {/* アイコンカラー */}
        <div>
          <label className="text-[14px] font-medium text-foreground">
            アイコンカラー
          </label>
          <div className="mt-2 flex gap-2">
            {ICON_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateField("icon_color", color)}
                className={`h-10 w-10 rounded-full transition-all ${
                  form.icon_color === color
                    ? "ring-2 ring-offset-2 ring-primary scale-110"
                    : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* 5領域タグ */}
        <div>
          <label className="text-[14px] font-medium text-foreground">
            支援領域
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {DOMAIN_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={form.domain_tags.includes(tag)}
                onToggle={() => toggleDomainTag(tag)}
                size="sm"
              />
            ))}
          </div>
        </div>

        {/* 目標 */}
        <div>
          <label className="text-[14px] font-medium text-foreground">
            個別目標
          </label>
          <div className="mt-2 flex flex-col gap-2">
            {form.goals.map((goal, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={goal}
                  onChange={(e) => updateGoal(i, e.target.value)}
                  placeholder={`目標 ${i + 1}`}
                />
                {form.goals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGoal(i)}
                    className="tap-target shrink-0 text-sub hover:text-danger"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addGoal}
              className="text-left text-[14px] text-primary font-medium"
            >
              + 目標を追加
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-danger-light px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}

        {/* 保存ボタン */}
        <div className="pb-4">
          <Button
            onClick={handleSave}
            fullWidth
            disabled={!form.name.trim() || saving}
          >
            {saving ? "保存中..." : "登録する"}
          </Button>
        </div>
      </div>
    </div>
  );
}
