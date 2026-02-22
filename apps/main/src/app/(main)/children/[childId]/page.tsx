"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { DOMAIN_TAGS } from "@patto/shared/constants";
import type { Child } from "@patto/shared/types";

const ICON_COLORS = [
  "#1B6B4A", "#E8913A", "#3B82F6", "#8B5CF6",
  "#EC4899", "#EF4444", "#14B8A6", "#F59E0B",
];

export default function EditChildPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    name_kana: "",
    birth_date: "",
    school: "",
    grade: "",
    icon_color: ICON_COLORS[0],
    goals: [""],
    domain_tags: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    const fetchChild = async () => {
      const supabase = createClient();
      const { data: rawData } = await supabase
        .from("children")
        .select("*")
        .eq("id", childId)
        .single();
      const data = rawData as Child | null;

      if (data) {
        setForm({
          name: data.name,
          name_kana: data.name_kana ?? "",
          birth_date: data.birth_date ?? "",
          school: data.school ?? "",
          grade: data.grade ?? "",
          icon_color: data.icon_color,
          goals: data.goals.length > 0 ? data.goals : [""],
          domain_tags: data.domain_tags,
          is_active: data.is_active,
        });
      }
      setLoading(false);
    };
    fetchChild();
  }, [childId]);

  const updateField = (field: string, value: string | boolean) => {
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

    const supabase = createClient();
    const { error } = await supabase
      .from("children")
      .update({
        name: form.name.trim(),
        name_kana: form.name_kana.trim() || null,
        birth_date: form.birth_date || null,
        school: form.school.trim() || null,
        grade: form.grade.trim() || null,
        icon_color: form.icon_color,
        goals: form.goals.filter((g) => g.trim()),
        domain_tags: form.domain_tags,
        is_active: form.is_active,
      })
      .eq("id", childId);

    if (!error) {
      router.push("/children");
      router.refresh();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("この児童を非表示にしますか？")) return;

    const supabase = createClient();
    await supabase
      .from("children")
      .update({ is_active: false })
      .eq("id", childId);

    router.push("/children");
    router.refresh();
  };

  if (loading) {
    return (
      <div>
        <Header title="児童編集" showBack />
        <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="児童編集" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
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

        {/* ボタン */}
        <div className="flex flex-col gap-3 pb-4">
          <Button
            onClick={handleSave}
            fullWidth
            disabled={!form.name.trim() || saving}
          >
            {saving ? "保存中..." : "保存する"}
          </Button>
          <Button variant="danger" onClick={handleDelete} fullWidth>
            非表示にする
          </Button>
        </div>
      </div>
    </div>
  );
}
