"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function NewActivityItemPage() {
  const router = useRouter();
  const { profile, isAdmin, loading } = useProfile();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    sort_order: 0,
    has_detail_field: false,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/settings");
    }
  }, [loading, isAdmin, router]);

  const handleSave = async () => {
    if (!form.name.trim() || !profile) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("activity_items").insert({
      facility_id: profile.facility_id,
      name: form.name.trim(),
      sort_order: form.sort_order,
      has_detail_field: form.has_detail_field,
      is_active: true,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("同じ名前の活動項目が既に存在します");
      } else {
        setError(`保存に失敗しました: ${insertError.message}`);
      }
      setSaving(false);
      return;
    }

    router.push("/settings/activities");
    router.refresh();
  };

  return (
    <div>
      <Header title="活動項目を追加" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
        <Input
          label="活動項目名"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="例: 眼球運動、宿題、漢字トレーニング"
        />

        <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
          <div className="flex-1">
            <p className="text-[14px] font-medium text-foreground">
              詳細記入欄を設ける
            </p>
            <p className="text-[12px] text-sub mt-0.5">
              記録入力画面で、選択時に自由記述の詳細欄を表示します（例: 漢字トレの内容）
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={form.has_detail_field}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  has_detail_field: e.target.checked,
                }))
              }
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5"></div>
          </label>
        </div>

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

        {error && (
          <p className="text-[13px] text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </p>
        )}

        <div className="pb-4">
          <Button
            onClick={handleSave}
            fullWidth
            disabled={!form.name.trim() || saving}
          >
            {saving ? "保存中..." : "追加する"}
          </Button>
        </div>
      </div>
    </div>
  );
}
