"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const facilityId = searchParams.get("facility") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    if (!facilityId) {
      setError("招待リンクが無効です");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.user) {
      setError("サインインに失敗しました: " + (signInError?.message ?? ""));
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: signInData.user.id,
      facility_id: facilityId,
      display_name: displayName.trim(),
      role: "staff",
    });

    if (profileError) {
      setError("登録に失敗しました: " + profileError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleJoin} className="flex flex-col gap-4">
      <Input
        label="あなたの名前 *"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="山田 花子"
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
        disabled={loading || !displayName.trim() || !facilityId}
      >
        {loading ? "登録中..." : "アカウント作成"}
      </Button>
    </form>
  );
}

export default function JoinPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl text-white font-bold">ぱ</span>
          </div>
          <h1 className="text-[24px] font-bold text-foreground">スタッフ登録</h1>
          <p className="mt-1 text-[14px] text-sub">
            招待リンクからアカウントを作成します
          </p>
        </div>

        <Suspense fallback={<p className="text-center text-sub text-[14px]">読み込み中...</p>}>
          <JoinForm />
        </Suspense>
      </div>
    </div>
  );
}
