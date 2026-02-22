"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const ChevronIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6B7280"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default function SettingsPage() {
  const router = useRouter();
  const { profile, isAdmin, loading } = useProfile();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div>
      <Header title="設定" />

      <div className="flex flex-col gap-3 px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
        ) : (
          <>
            <Link href="/settings/profile">
              <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white text-[16px] font-bold shrink-0">
                  {profile?.display_name?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-foreground truncate">
                    プロフィール
                  </p>
                  <p className="text-[13px] text-sub truncate">
                    {profile?.display_name ?? "未設定"}
                  </p>
                </div>
                <ChevronIcon />
              </Card>
            </Link>

            <Link href="/settings/phrases">
              <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white text-[18px] shrink-0">
                  💬
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-foreground">
                    フレーズ管理
                  </p>
                  <p className="text-[13px] text-sub">
                    記録用フレーズの追加・編集
                  </p>
                </div>
                <ChevronIcon />
              </Card>
            </Link>

            {isAdmin && (
              <>
                <Link href="/settings/staff">
                  <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3B82F6] text-white text-[18px] shrink-0">
                      👥
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-foreground">
                        スタッフ管理
                      </p>
                      <p className="text-[13px] text-sub">
                        招待・権限管理
                      </p>
                    </div>
                    <ChevronIcon />
                  </Card>
                </Link>

                <Link href="/settings/facility">
                  <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8B5CF6] text-white text-[18px] shrink-0">
                      🏢
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-foreground">
                        施設設定
                      </p>
                      <p className="text-[13px] text-sub">
                        施設名の変更
                      </p>
                    </div>
                    <ChevronIcon />
                  </Card>
                </Link>
              </>
            )}

            <div className="mt-4">
              <Button variant="danger" onClick={handleLogout} fullWidth>
                ログアウト
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
