"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { DOMAIN_TAGS } from "@patto/shared/constants";
import { Header } from "@/components/ui/Header";
import { Input, Textarea } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import type { Phrase } from "@patto/shared/types";

export default function EditPhrasePage() {
  const router = useRouter();
  const params = useParams();
  const phraseId = params.phraseId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: DOMAIN_TAGS[0] as string,
    text: "",
    domain_tags: [] as string[],
    sort_order: 0,
  });

  useEffect(() => {
    const fetchPhrase = async () => {
      const supabase = createClient();
      const { data: rawData } = await supabase
        .from("phrase_bank")
        .select("*")
        .eq("id", phraseId)
        .single();
      const data = rawData as Phrase | null;

      if (!data || data.is_default) {
        router.replace("/settings/phrases");
        return;
      }

      setForm({
        category: data.category,
        text: data.text,
        domain_tags: data.domain_tags,
        sort_order: data.sort_order,
      });
      setLoading(false);
    };
    fetchPhrase();
  }, [phraseId, router]);

  const toggleDomainTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      domain_tags: prev.domain_tags.includes(tag)
        ? prev.domain_tags.filter((t) => t !== tag)
        : [...prev.domain_tags, tag],
    }));
  };

  const handleSave = async () => {
    if (!form.text.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("phrase_bank")
      .update({
        category: form.category,
        text: form.text.trim(),
        domain_tags: form.domain_tags,
        sort_order: form.sort_order,
      })
      .eq("id", phraseId);

    if (!error) {
      router.push("/settings/phrases");
      router.refresh();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("このフレーズを削除しますか？")) return;

    const supabase = createClient();
    await supabase.from("phrase_bank").delete().eq("id", phraseId);

    router.push("/settings/phrases");
    router.refresh();
  };

  if (loading) {
    return (
      <div>
        <Header title="フレーズ編集" showBack />
        <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="フレーズ編集" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-foreground">
            カテゴリ
          </label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, category: e.target.value }))
            }
            className="tap-target w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {DOMAIN_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <Textarea
          label="フレーズ本文"
          value={form.text}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, text: e.target.value }))
          }
          placeholder="フレーズを入力"
        />

        <div>
          <label className="text-[14px] font-medium text-foreground">
            ドメインタグ
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
