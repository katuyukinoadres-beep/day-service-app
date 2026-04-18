"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ActivityItem } from "@patto/shared/types";

export default function EditActivityItemPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.activityId as string;
  const { isAdmin, loading: profileLoading } = useProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    sort_order: 0,
    has_detail_field: false,
    is_active: true,
  });

  useEffect(() => {
    if (profileLoading) return;
    if (!isAdmin) {
      router.replace("/settings");
      return;
    }
    const fetchItem = async () => {
      const supabase = createClient();
      const { data: rawData } = await supabase
        .from("activity_items")
        .select("*")
        .eq("id", activityId)
        .single();
      const data = rawData as ActivityItem | null;

      if (!data) {
        router.replace("/settings/activities");
        return;
      }

      setForm({
        name: data.name,
        sort_order: data.sort_order,
        has_detail_field: data.has_detail_field,
        is_active: data.is_active,
      });
      setLoading(false);
    };
    fetchItem();
  }, [activityId, isAdmin, profileLoading, router]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("activity_items")
      .update({
        name: form.name.trim(),
        sort_order: form.sort_order,
        has_detail_field: form.has_detail_field,
        is_active: form.is_active,
      })
      .eq("id", activityId);

    if (updateError) {
      if (updateError.code === "23505") {
        setError("同じ名前の活動項目が既に存在します");
      } else {
        setError(`保存に失敗しました: ${updateError.message}`);
      }
      setSaving(false);
      return;
    }

    router.push("/settings/activities");
    router.refresh();
  };

  const handleArchive = async () => {
    if (!confirm("この活動項目を廃止しますか？\n過去の記録は維持されますが、新規記録では選択できなくなります。")) return;

    const supabase = createClient();
    await supabase
      .from("activity_items")
      .update({ is_active: false })
      .eq("id", activityId);

    router.push("/settings/activities");
    router.refresh();
  };

  const handleRestore = async () => {
    const supabase = createClient();
    await supabase
      .from("activity_items")
      .update({ is_active: true })
      .eq("id", activityId);

    setForm((prev) => ({ ...prev, is_active: true }));
  };

  if (loading) {
    return (
      <div>
        <Header title="活動項目を編集" showBack />
        <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="活動項目を編集" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
        {!form.is_active && (
          <div className="rounded-lg bg-gray-100 p-3">
            <p className="text-[13px] text-foreground">
              この項目は廃止されています。過去記録との整合性保持のため残置されています。
            </p>
          </div>
        )}

        <Input
          label="活動項目名"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="例: 眼球運動"
        />

        <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
          <div className="flex-1">
            <p className="text-[14px] font-medium text-foreground">
              詳細記入欄を設ける
            </p>
            <p className="text-[12px] text-sub mt-0.5">
              記録入力画面で、選択時に自由記述の詳細欄を表示します
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

        <div className="flex flex-col gap-3 pb-4">
          <Button
            onClick={handleSave}
            fullWidth
            disabled={!form.name.trim() || saving}
          >
            {saving ? "保存中..." : "保存する"}
          </Button>
          {form.is_active ? (
            <Button variant="danger" onClick={handleArchive} fullWidth>
              廃止する
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleRestore} fullWidth>
              有効に戻す
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
