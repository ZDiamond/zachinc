/**
 * Google Calendar, read only.
 *
 * Supabase hands back a provider refresh token at sign-in. We keep it in a
 * table the browser cannot read and mint short-lived access tokens server-side
 * as needed. The board never sees a Google token.
 */

import { supabaseAdmin } from "./supabase/server";
import { missingCalendarEnv } from "./env";
import type { CalendarEvent } from "./day";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  accessToken?: string,
  expiresIn?: number
) {
  if (missingCalendarEnv().length) return;
  const admin = supabaseAdmin();
  await admin.from("google_tokens").upsert(
    {
      user_id: userId,
      refresh_token: refreshToken,
      access_token: accessToken ?? null,
      expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      scope: CALENDAR_SCOPE,
    },
    { onConflict: "user_id" }
  );
}

/** A valid access token, refreshing only when the cached one is close to expiry. */
export async function getAccessToken(userId: string): Promise<string | null> {
  // Without the server-side credentials there is no way to reach Google. The
  // board still works; it just plans the day as if nothing is booked.
  if (missingCalendarEnv().length) return null;
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("google_tokens")
    .select("refresh_token, access_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.refresh_token) return null;

  const stillGood =
    data.access_token &&
    data.expires_at &&
    new Date(data.expires_at).getTime() - Date.now() > 120_000;
  if (stillGood) return data.access_token as string;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token as string,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { access_token: string; expires_in: number };

  await admin
    .from("google_tokens")
    .update({
      access_token: json.access_token,
      expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId);

  return json.access_token;
}

type GoogleEvent = {
  id: string;
  summary?: string;
  status?: string;
  transparency?: string;
  eventType?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
};

/** Minutes past midnight for an RFC3339 instant, in the given timezone. */
function localMinutes(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return (h % 24) * 60 + m;
}

/**
 * Today's events, as the day engine wants them.
 *
 * Declined invitations and events marked "free" are skipped: they do not
 * actually consume the day, so they should not push deep work around.
 */
export async function fetchDayEvents(
  userId: string,
  isoDate: string,
  timeZone: string
): Promise<{ events: CalendarEvent[]; error?: string }> {
  const missing = missingCalendarEnv();
  if (missing.length) {
    return { events: [], error: `missing_env:${missing.join(",")}` };
  }

  let token: string | null = null;
  try {
    token = await getAccessToken(userId);
  } catch {
    return { events: [], error: "token_refresh_failed" };
  }
  if (!token) return { events: [], error: "not_connected" };

  const url = new URL(EVENTS_URL);
  url.searchParams.set("timeMin", `${isoDate}T00:00:00`);
  url.searchParams.set("timeMax", `${isoDate}T23:59:59`);
  url.searchParams.set("timeZone", timeZone);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");

  let json: { items?: GoogleEvent[] };
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { events: [], error: res.status === 401 ? "reauth_needed" : `google_${res.status}` };
    }
    json = (await res.json()) as { items?: GoogleEvent[] };
  } catch {
    return { events: [], error: "google_unreachable" };
  }
  const events: CalendarEvent[] = [];

  for (const item of json.items ?? []) {
    if (item.status === "cancelled") continue;
    if (item.transparency === "transparent") continue;
    if (item.eventType === "birthday" || item.eventType === "workingLocation") continue;

    const self = item.attendees?.find((a) => a.self);
    if (self?.responseStatus === "declined") continue;

    const title = item.summary?.trim() || "(untitled)";

    if (item.start?.date) {
      events.push({ id: item.id, title, start: 0, end: 0, allDay: true });
      continue;
    }
    if (!item.start?.dateTime || !item.end?.dateTime) continue;

    let start = localMinutes(item.start.dateTime, timeZone);
    let end = localMinutes(item.end.dateTime, timeZone);
    // An event that runs past midnight clamps to the end of the day.
    if (end <= start) end = 24 * 60 - 1;

    events.push({ id: item.id, title, start, end });
  }

  return { events };
}
