"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { DOMAIN_TAGS } from "@patto/shared/constants";
import { Header } from "@/components/ui/Header";
import { Input, Textarea } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

export default function NewPhrasePage() {
  const router = useRouter();
  const { profile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: DOMAIN_TAGS[0] as string,
    text: "",
    domain_tags: [] as string[],
    sort_order: 0,
  });

  const toggleDomainTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      domain_tags: prev.domain_tags.includes(tag)
        ? prev.domain_tags.filter((t) => t !== tag)
        : [...prev.domain_tags, tag],
    }));
  };

  const handleSave = async () => {
    if (!form.text.trim() || !profile) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("phrase_bank").insert({
      facility_id: profile.facility_id,
      category: form.category,
      text: form.text.trim(),
      domain_tags: form.domain_tags,
      sort_order: form.sort_order,
      is_default: false,
    });

    if (!error) {
      router.push("/settings/phrases");
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <div>
      <Header title="フレーズ追加" showBack />

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
