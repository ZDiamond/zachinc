/**
 * Turning calendar meetings into CRM suggestions.
 *
 * Nothing here writes to the CRM. It produces two lists and Zach decides:
 * people he met who are not in the CRM, and people who are but whose last
 * contact date is stale. A calendar full of contractors and dentists means
 * auto-creating records would bury the pipeline in noise, so every addition
 * stays a deliberate act.
 */

import type { MeetingWithPeople } from "./google";
import type { Opportunity } from "./crm";

export type NewPersonSuggestion = {
  email: string;
  name: string;
  /** The most recent meeting they appeared in. */
  lastMeeting: { title: string; date: string };
  /** How many meetings in the window they appeared in. */
  count: number;
};

export type ContactUpdate = {
  opportunity: Opportunity;
  metOn: string;
  title: string;
};

/** "Zach Diamond" and "zach diamond " compare equal. */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * A display name for someone we only know by email address.
 * "becki.holmes@foodwit.com" becomes "Becki Holmes".
 */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** The company part of an email, when it is not a consumer mailbox. */
const CONSUMER_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "pm.me",
]);

export function orgFromEmail(email: string): string {
  const domain = (email.split("@")[1] ?? "").toLowerCase();
  if (!domain || CONSUMER_DOMAINS.has(domain)) return "";
  const base = domain.split(".")[0] ?? "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export type BuildInput = {
  meetings: MeetingWithPeople[];
  opportunities: Opportunity[];
  ignoredEmails: string[];
  /** Meetings on or before this date count as having happened. */
  today: string;
};

export type Suggestions = {
  newPeople: NewPersonSuggestion[];
  contactUpdates: ContactUpdate[];
};

export function buildSuggestions({
  meetings,
  opportunities,
  ignoredEmails,
  today,
}: BuildInput): Suggestions {
  const ignored = new Set(ignoredEmails.map((e) => e.toLowerCase().trim()));

  // Index the CRM by email and, for records added before emails were captured,
  // by name as a fallback.
  const byEmail = new Map<string, Opportunity>();
  const byName = new Map<string, Opportunity>();
  for (const o of opportunities) {
    const email = (o.email ?? "").toLowerCase().trim();
    if (email) byEmail.set(email, o);
    if (o.name.trim()) byName.set(normalizeName(o.name), o);
  }

  function findExisting(email: string, name: string): Opportunity | undefined {
    return byEmail.get(email) ?? (name ? byName.get(normalizeName(name)) : undefined);
  }

  const newPeople = new Map<string, NewPersonSuggestion>();
  const updates = new Map<string, ContactUpdate>();

  for (const meeting of meetings) {
    // Only meetings that have already happened are evidence of contact.
    const happened = meeting.date <= today;

    for (const person of meeting.people) {
      const email = person.email;
      if (!email || ignored.has(email)) continue;

      const existing = findExisting(email, person.name);

      if (existing) {
        if (!happened) continue;
        // Offer to move last contact forward only if the meeting is newer.
        const current = existing.last_contact_on ?? "";
        if (current >= meeting.date) continue;
        const prior = updates.get(existing.id);
        if (!prior || prior.metOn < meeting.date) {
          updates.set(existing.id, {
            opportunity: existing,
            metOn: meeting.date,
            title: meeting.title,
          });
        }
        continue;
      }

      const prior = newPeople.get(email);
      if (prior) {
        prior.count += 1;
        if (meeting.date > prior.lastMeeting.date) {
          prior.lastMeeting = { title: meeting.title, date: meeting.date };
        }
        if (!prior.name && person.name) prior.name = person.name;
      } else {
        newPeople.set(email, {
          email,
          name: person.name || nameFromEmail(email),
          lastMeeting: { title: meeting.title, date: meeting.date },
          count: 1,
        });
      }
    }
  }

  return {
    // Most recent first: what you just met about is what you are most able to
    // judge.
    newPeople: [...newPeople.values()].sort((a, b) =>
      a.lastMeeting.date === b.lastMeeting.date
        ? b.count - a.count
        : a.lastMeeting.date < b.lastMeeting.date
          ? 1
          : -1
    ),
    contactUpdates: [...updates.values()].sort((a, b) => (a.metOn < b.metOn ? 1 : -1)),
  };
}
