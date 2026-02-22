"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function FacilityPage() {
  const router = useRouter();
  const { profile, isAdmin, loading: profileLoading } = useProfile();
  const [facilityName, setFacilityName] = useState("");
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
        .select("name")
        .eq("id", profile.facility_id)
        .single();

      if (data) {
        setFacilityName((data as { name: string }).name);
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
      .update({ name: facilityName.trim() })
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
