import LoginButton from "@/components/LoginButton";
import SetupNeeded from "@/components/SetupNeeded";
import { missingCoreEnv } from "@/lib/env";

const MESSAGES: Record<string, string> = {
  not_allowed: "That Google account is not the one this board belongs to.",
  exchange_failed: "Google sign-in did not complete. Try again.",
  missing_code: "Google sign-in did not complete. Try again.",
  access_denied: "Sign-in was cancelled.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const missing = missingCoreEnv();
  if (missing.length) return <SetupNeeded missing={missing} />;

  const err = searchParams.error;
  return (
    <div className="login">
      <div className="wordmark" style={{ fontSize: 26, marginBottom: 28 }}>
        Zach <span>Inc.</span>
      </div>
      <h1>Daily operating board</h1>
      <p>
        Sign in with Google. The board reads your calendar to shape the day around the meetings you
        actually have.
      </p>
      <LoginButton />
      {err ? <p className="err">{MESSAGES[err] ?? `Sign-in error: ${err}`}</p> : null}
    </div>
  );
}
