"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // 1. ユーザー作成
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. 明示的にサインインしてセッションを確立
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.user) {
      setError("サインインに失敗しました: " + (signInError?.message ?? ""));
      setLoading(false);
      return;
    }

    // 3. 施設作成
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .insert({ name: facilityName.trim() })
      .select("id")
      .single();

    if (facilityError || !facility) {
      setError("施設の作成に失敗しました: " + (facilityError?.message ?? ""));
      setLoading(false);
      return;
    }

    // 4. プロフィール作成（管理者）
    const { error: profileError } = await supabase.from("profiles").insert({
      id: signInData.user.id,
      facility_id: facility.id,
      display_name: displayName.trim(),
      role: "admin",
    });

    if (profileError) {
      setError(
        "プロフィールの作成に失敗しました: " + profileError.message
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl text-white font-bold">ぱ</span>
          </div>
          <h1 className="text-[24px] font-bold text-foreground">ぱっと記録</h1>
          <p className="mt-1 text-[14px] text-sub">
            放課後等デイサービス支援記録
          </p>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              required
              autoComplete="email"
            />

            <Input
              label="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-lg bg-danger-light px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </Button>

            <p className="text-center text-[13px] text-sub">
              アカウントをお持ちでない方は{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className="text-primary font-medium underline"
              >
                新規登録
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <Input
              label="施設名 *"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              placeholder="○○放課後デイサービス"
              required
            />

            <Input
              label="あなたの名前 *"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="山田 太郎"
              required
            />

            <Input
              label="メールアドレス *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              required
              autoComplete="email"
            />

            <Input
              label="パスワード *"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="rounded-lg bg-danger-light px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              disabled={
                loading ||
                !facilityName.trim() ||
                !displayName.trim()
              }
            >
              {loading ? "作成中..." : "アカウント作成"}
            </Button>

            <p className="text-center text-[13px] text-sub">
              アカウントをお持ちの方は{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="text-primary font-medium underline"
              >
                ログイン
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
