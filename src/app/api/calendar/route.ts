import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { fetchDayEvents } from "@/lib/google";
import { allowedEmail } from "@/lib/auth";
import { TZ, isoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const allow = allowedEmail();
  if (allow && (user.email ?? "").toLowerCase() !== allow) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const date = request.nextUrl.searchParams.get("date") ?? isoDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "bad_date" }, { status: 400 });
  }

  const { events, error } = await fetchDayEvents(user.id, date, TZ);
  return NextResponse.json({ events, error: error ?? null });
}
