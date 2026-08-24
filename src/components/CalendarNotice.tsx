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

  return (
    <div className="notes">
      <p>Could not read the calendar ({error}). Today is built as if nothing is booked.</p>
    </div>
  );
}
