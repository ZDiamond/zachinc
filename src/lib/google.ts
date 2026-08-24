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

type GoogleAttendee = {
  email?: string;
  displayName?: string;
  self?: boolean;
  organizer?: boolean;
  resource?: boolean;
  optional?: boolean;
  responseStatus?: string;
};

type GoogleEvent = {
  id: string;
  summary?: string;
  status?: string;
  transparency?: string;
  eventType?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { email?: string; displayName?: string; self?: boolean };
  attendees?: GoogleAttendee[];
};

/** One meeting with other people in it, as the suggestion pass wants it. */
export type MeetingWithPeople = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD in the user's timezone
  people: { email: string; name: string }[];
};

/**
 * The UTC offset in effect in `timeZone` on `isoDate`, as "-05:00".
 *
 * Google requires timeMin and timeMax to carry an explicit offset; a bare
 * local timestamp is rejected outright. The offset has to be computed per date
 * because it shifts with daylight saving.
 */
function utcOffset(isoDate: string, timeZone: string): string {
  // Probe at midday UTC so the calendar date is unambiguous in any zone.
  const probe = new Date(`${isoDate}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(probe);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  const match = name.match(/GMT([+-]\d{2}:\d{2})/);
  if (match) return match[1];
  // Some runtimes render UTC itself as a bare "GMT".
  return name === "GMT" ? "+00:00" : "+00:00";
}

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
 * Meetings across a date range that had other people in them.
 *
 * Solo blocks, all-day markers, and anything Zach declined are skipped, as are
 * large meetings: a twenty-person webinar is not a relationship, and treating
 * it as one is how a CRM fills with noise.
 */
export async function fetchMeetingsInRange(
  userId: string,
  fromDate: string,
  toDate: string,
  timeZone: string,
  maxAttendees = 6
): Promise<{ meetings: MeetingWithPeople[]; error?: string }> {
  const missing = missingCalendarEnv();
  if (missing.length) return { meetings: [], error: `missing_env:${missing.join(",")}` };

  let token: string | null = null;
  try {
    token = await getAccessToken(userId);
  } catch {
    return { meetings: [], error: "token_refresh_failed" };
  }
  if (!token) return { meetings: [], error: "not_connected" };

  const url = new URL(EVENTS_URL);
  url.searchParams.set("timeMin", `${fromDate}T00:00:00${utcOffset(fromDate, timeZone)}`);
  url.searchParams.set("timeMax", `${toDate}T23:59:59${utcOffset(toDate, timeZone)}`);
  url.searchParams.set("timeZone", timeZone);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  let json: { items?: GoogleEvent[] };
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 401) return { meetings: [], error: "reauth_needed" };
      return { meetings: [], error: `google_${res.status}` };
    }
    json = (await res.json()) as { items?: GoogleEvent[] };
  } catch {
    return { meetings: [], error: "google_unreachable" };
  }

  const meetings: MeetingWithPeople[] = [];

  for (const item of json.items ?? []) {
    if (item.status === "cancelled") continue;
    if (item.eventType === "birthday" || item.eventType === "workingLocation") continue;
    if (!item.start?.dateTime) continue; // all-day entries are not meetings

    const self = item.attendees?.find((a) => a.self);
    if (self?.responseStatus === "declined") continue;

    const attendees = item.attendees ?? [];
    if (attendees.length === 0) continue; // a solo block on the calendar
    if (attendees.length > maxAttendees) continue; // a broadcast, not a relationship

    const people = attendees
      .filter((a) => !a.self && !a.resource && a.email)
      .filter((a) => a.responseStatus !== "declined")
      .map((a) => ({
        email: (a.email ?? "").toLowerCase().trim(),
        name: (a.displayName ?? "").trim(),
      }))
      .filter((a) => a.email && !a.email.endsWith("calendar.google.com"));

    if (people.length === 0) continue;

    meetings.push({
      id: item.id,
      title: item.summary?.trim() || "(untitled)",
      date: new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(item.start.dateTime)),
      people,
    });
  }

  return { meetings };
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

  const offset = utcOffset(isoDate, timeZone);
  const url = new URL(EVENTS_URL);
  url.searchParams.set("timeMin", `${isoDate}T00:00:00${offset}`);
  url.searchParams.set("timeMax", `${isoDate}T23:59:59${offset}`);
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
      if (res.status === 401) return { events: [], error: "reauth_needed" };
      // Google explains itself in the body. Carrying that through turns a bare
      // status code into something actionable.
      let detail = "";
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        detail = body.error?.message ? `: ${body.error.message.slice(0, 160)}` : "";
      } catch {
        // Non-JSON body. The status code is all we have.
      }
      return { events: [], error: `google_${res.status}${detail}` };
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
