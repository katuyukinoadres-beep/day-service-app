"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type FacilitySettings = {
  name: string;
  paper_mode_enabled: boolean;
};

export default function FacilityPage() {
  const router = useRouter();
  const { profile, isAdmin, loading: profileLoading } = useProfile();
  const [facilityName, setFacilityName] = useState("");
  const [paperMode, setPaperMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profileLoading) return;
    if (!isAdmin) {
      router.replace("/settings");
      return;
    }

    const fetchFacility = async () => {
      if (!profile) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("facilities")
        .select("name, paper_mode_enabled")
        .eq("id", profile.facility_id)
        .single();

      const typed = data as FacilitySettings | null;
      if (typed) {
        setFacilityName(typed.name);
        setPaperMode(typed.paper_mode_enabled);
      }
      setLoading(false);
    };
    fetchFacility();
  }, [profile, isAdmin, profileLoading, router]);

  const handleSave = async () => {
    if (!facilityName.trim() || !profile) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("facilities")
      .update({
        name: facilityName.trim(),
        paper_mode_enabled: paperMode,
      })
      .eq("id", profile.facility_id);

    if (!error) {
      router.push("/settings");
      router.refresh();
    }
    setSaving(false);
  };

  if (profileLoading || loading) {
    return (
      <div>
        <Header title="施設設定" showBack />
        <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="施設設定" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
        <Input
          label="施設名"
          value={facilityName}
          onChange={(e) => setFacilityName(e.target.value)}
          placeholder="施設名を入力"
        />

        <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
          <div className="flex-1">
            <p className="text-[14px] font-medium text-foreground">
              紙併用モード
            </p>
            <p className="text-[12px] text-sub mt-0.5">
              紙→アプリ切替の移行期（推奨 2週間）に ON にすると、
              <br />
              ホーム画面に「紙で記入してもOK」の案内が出ます。
              <br />
              全員の習熟後に OFF にしてデジタル必須運用へ移行。
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center ml-3">
            <input
              type="checkbox"
              checked={paperMode}
              onChange={(e) => setPaperMode(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5"></div>
          </label>
        </div>

        <div className="pb-4">
          <Button
            onClick={handleSave}
            fullWidth
            disabled={!facilityName.trim() || saving}
          >
            {saving ? "保存中..." : "保存する"}
          </Button>
        </div>
      </div>
    </div>
  );
}
