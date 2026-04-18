"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { Header } from "@/components/ui/Header";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function NewQuickTemplateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useProfile();
  const initialType =
    (searchParams.get("type") as "topics" | "notes" | null) ?? "topics";

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    field_type: initialType as "topics" | "notes",
    text: "",
    sort_order: 0,
  });

  const handleSave = async () => {
    if (!form.text.trim() || !profile) return;
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    await supabase.from("quick_templates").insert({
      user_id: user.id,
      field_type: form.field_type,
      text: form.text.trim(),
      sort_order: form.sort_order,
      is_active: true,
    });

    router.push("/settings/quick-templates");
    router.refresh();
  };

  return (
    <div>
      <Header title="クイック入力テンプレート追加" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-foreground">
            対象フィールド
          </label>
          <select
            value={form.field_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                field_type: e.target.value as "topics" | "notes",
              }))
            }
            className="tap-target w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="topics">活動中のトピックス</option>
            <option value="notes">特記事項</option>
          </select>
        </div>

        <Textarea
          label="テンプレート本文"
          value={form.text}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, text: e.target.value }))
          }
          placeholder={
            form.field_type === "topics"
              ? "例: お友達と仲良く遊べました"
              : "例: 午後から熱っぽさあり、保護者へ連絡予定"
          }
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

        <div className="pb-4">
          <Button
            onClick={handleSave}
            fullWidth
            disabled={!form.text.trim() || saving}
          >
            {saving ? "保存中..." : "追加する"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewQuickTemplatePage() {
  return (
    <Suspense
      fallback={
        <div>
          <Header title="クイック入力テンプレート追加" showBack />
          <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
        </div>
      }
    >
      <NewQuickTemplateForm />
    </Suspense>
  );
}
