"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export default function LoginButton() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: CALENDAR_SCOPE,
        queryParams: {
          // offline + consent is what makes Google return a refresh token, so the
          // board can read the calendar tomorrow without another sign-in.
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) setBusy(false);
  }

  return (
    <button className="btn" onClick={signIn} disabled={busy}>
      {busy ? "Opening Google..." : "Sign in with Google"}
    </button>
  );
}
