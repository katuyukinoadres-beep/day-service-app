"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/useProfile";
import { createClient } from "@patto/shared/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";

export default function InviteStaffPage() {
  const router = useRouter();
  const { profile, isAdmin, loading: profileLoading } = useProfile();
  const [facilityName, setFacilityName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profileLoading) return;
    if (!isAdmin) {
      router.replace("/settings");
      return;
    }
    const fetchFacility = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("facilities")
        .select("name")
        .single();
      if (data) setFacilityName((data as { name: string }).name);
    };
    fetchFacility();
  }, [profileLoading, isAdmin, router]);

  const joinUrl = profile
    ? `${window.location.origin}/join?facility=${profile.facility_id}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (profileLoading) {
    return (
      <div>
        <Header title="スタッフ招待" showBack />
        <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="スタッフ招待" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
        <div>
          <p className="text-[15px] font-medium text-foreground mb-2">
            招待リンク
          </p>
          <p className="text-[13px] text-sub mb-3">
            以下のリンクをスタッフに共有してください。リンクからアカウントを作成すると、「{facilityName}」のスタッフとして登録されます。
          </p>
          <div className="rounded-xl border border-border bg-gray-50 px-4 py-3">
            <p className="text-[13px] text-foreground break-all">{joinUrl}</p>
          </div>
        </div>

        <Button onClick={handleCopy} fullWidth>
          {copied ? "コピーしました!" : "リンクをコピー"}
        </Button>
      </div>
    </div>
  );
}
