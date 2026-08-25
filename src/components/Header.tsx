"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

export default function Header({
  dateLabel,
  phase,
  active,
}: {
  dateLabel: string;
  phase: string;
  active: "board" | "crm" | "voice" | "substance" | "review";
}) {
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="top">
      <div className="wordmark">
        Zach <span>Inc.</span>
      </div>
      <div className="hdate">{dateLabel}</div>
      <div className="phase">{phase}</div>
      <nav className="navlinks">
        <a href="/" aria-current={active === "board" ? "page" : undefined}>
          Board
        </a>
        <a href="/crm" aria-current={active === "crm" ? "page" : undefined}>
          CRM
        </a>
        <a href="/voice" aria-current={active === "voice" ? "page" : undefined}>
          Voice
        </a>
        <a href="/substance" aria-current={active === "substance" ? "page" : undefined}>
          Substance
        </a>
        <a href="/review" aria-current={active === "review" ? "page" : undefined}>
          Review
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); signOut(); }}>
          Sign out
        </a>
      </nav>
    </header>
  );
}
