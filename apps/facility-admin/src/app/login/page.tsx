"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deactivated = searchParams.get("reason") === "deactivated";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setLoading(false);
      return;
    }

    // 管理者ロール以外を弾く
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .maybeSingle();
    const profile = profileRow as
      | { role: "admin" | "staff"; is_active: boolean }
      | null;

    if (!profile) {
      setError("プロフィールが見つかりません。管理者にお問い合わせください。");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (!profile.is_active) {
      setError("このアカウントは無効化されています。");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (profile.role !== "admin") {
      setError(
        "このダッシュボードは管理者ロールのアカウントのみ利用できます。",
      );
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-white">ぱ</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            事業所長ダッシュボード
          </h1>
          <p className="mt-2 text-sm text-sub">管理者ログイン</p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-border">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-sub/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-sub/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {deactivated && !error && (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 border border-amber-200">
                このアカウントは無効化されました。管理者にお問い合わせください。
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-sub">読み込み中...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
