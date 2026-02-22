"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  useEffect(() => {
    const fetchEmail = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };
    fetchEmail();
  }, []);

  const handleSave = async () => {
    if (!displayName.trim() || !profile) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", profile.id);

    if (!error) {
      router.push("/settings");
      router.refresh();
    }
    setSaving(false);
  };

  if (profileLoading) {
    return (
      <div>
        <Header title="プロフィール" showBack />
        <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="プロフィール" showBack />

      <div className="flex flex-col gap-5 px-4 py-4">
        <Input
          label="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="表示名を入力"
        />

        <Input
          label="メールアドレス"
          value={email}
          disabled
        />

        <Input
          label="権限"
          value={profile?.role === "admin" ? "管理者" : "スタッフ"}
          disabled
        />

        <div className="pb-4">
          <Button
            onClick={handleSave}
            fullWidth
            disabled={!displayName.trim() || saving}
          >
            {saving ? "保存中..." : "保存する"}
          </Button>
        </div>
      </div>
    </div>
  );
}
