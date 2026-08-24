/**
 * Environment checks.
 *
 * A missing variable used to surface as an opaque 500 from deep inside the
 * Supabase client, which is useless when you are standing in a dashboard trying
 * to work out what you forgot. These helpers let the app say which variable is
 * missing instead.
 */

export const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/** Needed only for the calendar, so the board still works without them. */
export const CALENDAR_ENV = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

function missingFrom(names: readonly string[]): string[] {
  return names.filter((n) => !(process.env[n] ?? "").trim());
}

/** Variables without which nothing can render. */
export function missingCoreEnv(): string[] {
  return missingFrom(REQUIRED_ENV);
}

/** Variables without which the calendar cannot be read. */
export function missingCalendarEnv(): string[] {
  return missingFrom(CALENDAR_ENV);
}

export function hasCoreEnv(): boolean {
  return missingCoreEnv().length === 0;
}
