"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { Header } from "@/components/ui/Header";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { QuickTemplate } from "@patto/shared/types";

const FIELD_LABELS: Record<"topics" | "notes", string> = {
  topics: "活動中のトピックス",
  notes: "特記事項",
};

export default function EditQuickTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    field_type: "topics" as "topics" | "notes",
    text: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    const fetchItem = async () => {
      const supabase = createClient();
      const { data: rawData } = await supabase
        .from("quick_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      const data = rawData as QuickTemplate | null;

      if (!data) {
        router.replace("/settings/quick-templates");
        return;
      }

      setForm({
        field_type: data.field_type,
        text: data.text,
        sort_order: data.sort_order,
        is_active: data.is_active,
      });
      setLoading(false);
    };
    fetchItem();
  }, [templateId, router]);

  const handleSave = async () => {
    if (!form.text.trim()) return;
    setSaving(true);

    const supabase = createClient();
    await supabase
      .from("quick_templates")
      .update({
        text: form.text.trim(),
        sort_order: form.sort_order,
        is_active: form.is_active,
      })
      .eq("id", templateId);

    router.push("/settings/quick-templates");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("このテンプレートを削除しますか？")) return;

    const supabase = createClient();
    await supabase.from("quick_templates").delete().eq("id", templateId);

    router.push("/settings/quick-templates");
    router.refresh();
  };

  if (loading) {
    return (
      <div>
        <Header title="クイック入力テンプレート編集" showBack />
        <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="クイック入力テンプレート編集" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
        <div className="rounded-lg bg-gray-100 p-3">
          <p className="text-[13px] text-foreground">
            対象フィールド: <strong>{FIELD_LABELS[form.field_type]}</strong>
          </p>
          <p className="text-[12px] text-sub mt-1">
            ※ 対象フィールドは作成後変更できません
          </p>
        </div>

        <Textarea
          label="テンプレート本文"
          value={form.text}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, text: e.target.value }))
          }
          placeholder="テンプレート内容を入力"
        />

        <Input
          label="表示順"
          type="number"
          value={String(form.sort_order)}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              sort_order: parseInt(e.target.value) || 0,
            }))
          }
          placeholder="0"
        />

        <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
          <div className="flex-1">
            <p className="text-[14px] font-medium text-foreground">有効</p>
            <p className="text-[12px] text-sub mt-0.5">
              OFF にすると記録入力画面で表示されなくなります
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5"></div>
          </label>
        </div>

        <div className="flex flex-col gap-3 pb-4">
          <Button
            onClick={handleSave}
            fullWidth
            disabled={!form.text.trim() || saving}
          >
            {saving ? "保存中..." : "保存する"}
          </Button>
          <Button variant="danger" onClick={handleDelete} fullWidth>
            削除する
          </Button>
        </div>
      </div>
    </div>
  );
}
