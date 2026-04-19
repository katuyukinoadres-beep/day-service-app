import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPath = request.nextUrl.pathname.startsWith("/login");
  const isForbiddenPath = request.nextUrl.pathname.startsWith("/forbidden");

  if (!user && !isLoginPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("is_active, role")
      .eq("id", user.id)
      .maybeSingle();
    const profile = profileRow as
      | { is_active: boolean; role: "admin" | "staff" }
      | null;

    // 退職処理済みユーザーは強制ログアウト
    if (profile && profile.is_active === false && !isLoginPath) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("reason", "deactivated");
      return NextResponse.redirect(url);
    }

    // 管理者ロール以外は /forbidden へ
    if (profile && profile.role !== "admin" && !isForbiddenPath && !isLoginPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/forbidden";
      return NextResponse.redirect(url);
    }

    // 認証済み管理者がログインページにアクセスした場合はホームへ
    if (profile?.role === "admin" && isLoginPath) {
      if (request.nextUrl.searchParams.get("reason") !== "deactivated") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)",
  ],
};
