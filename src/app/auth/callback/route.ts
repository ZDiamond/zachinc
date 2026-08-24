import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { storeRefreshToken } from "@/lib/google";
import { allowedEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const user = data.session.user;
  const allow = allowedEmail();
  if (allow && (user.email ?? "").toLowerCase() !== allow) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  // Keep the Google refresh token so the board can read the calendar later
  // without sending Zach back through the consent screen every hour.
  const refresh = data.session.provider_refresh_token;
  if (refresh) {
    await storeRefreshToken(user.id, refresh, data.session.provider_token ?? undefined, 3600);
  }

  return NextResponse.redirect(origin + "/");
}
