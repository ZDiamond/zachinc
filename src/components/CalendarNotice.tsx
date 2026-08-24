"use client";

import LoginButton from "./LoginButton";

/**
 * Says plainly when the calendar could not be read, rather than rendering an
 * empty day that looks like a free one.
 */
export default function CalendarNotice({ error }: { error: string | null }) {
  if (!error) return null;

  if (error === "not_connected" || error === "reauth_needed") {
    return (
      <div className="notes">
        <p>
          Google Calendar is not connected, so today is built as if nothing is booked. Sign in
          again to grant calendar access.
        </p>
        <div style={{ marginTop: 10 }}>
          <LoginButton />
        </div>
      </div>
    );
  }

  if (error.startsWith("missing_env:")) {
    const vars = error.slice("missing_env:".length).split(",");
    return (
      <div className="notes">
        <p>
          Calendar access is not configured: {vars.join(", ")} {vars.length === 1 ? "is" : "are"} not
          set on this deployment. Today is built as if nothing is booked.
        </p>
      </div>
    );
  }

  const explain: Record<string, string> = {
    token_refresh_failed:
      "Google refused to refresh the access token. The client secret may be wrong, or access was revoked.",
    google_unreachable: "Could not reach Google Calendar.",
    google_403:
      "Google returned 403. The Calendar API is probably not enabled on the Cloud project.",
  };

  return (
    <div className="notes">
      <p>
        {explain[error] ?? `Could not read the calendar (${error}).`} Today is built as if nothing is
        booked.
      </p>
    </div>
  );
}
