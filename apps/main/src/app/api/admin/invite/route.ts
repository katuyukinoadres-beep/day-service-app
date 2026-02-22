import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@patto/shared/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email, displayName, role } = await request.json();

    if (!email || !displayName) {
      return NextResponse.json(
        { error: "メールアドレスと表示名は必須です" },
        { status: 400 }
      );
    }

    if (role && !["admin", "staff"].includes(role)) {
      return NextResponse.json(
        { error: "無効な権限です" },
        { status: 400 }
      );
    }

    // 呼び出し元ユーザーを認証
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    // admin権限を確認
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("facility_id, role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      );
    }

    // service_roleクライアントで招待
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: inviteData, error: inviteError } =
      await serviceClient.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      );
    }

    // profilesにINSERT
    if (inviteData.user) {
      const { error: profileError } = await serviceClient
        .from("profiles")
        .insert({
          id: inviteData.user.id,
          facility_id: callerProfile.facility_id,
          display_name: displayName,
          role: role || "staff",
        });

      if (profileError) {
        return NextResponse.json(
          { error: "プロフィール作成に失敗しました: " + profileError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
