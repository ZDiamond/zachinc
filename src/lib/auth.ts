import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";

/**
 * The board is Zach's. Sign-in is Google, and only this address gets in.
 * Set ALLOWED_EMAIL in the environment; anything else is bounced.
 */
export function allowedEmail(): string {
  return (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase();
}

export async function requireUser() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const allow = allowedEmail();
  if (allow && (user.email ?? "").toLowerCase() !== allow) {
    redirect("/login?error=not_allowed");
  }

  return { user, supabase };
}
