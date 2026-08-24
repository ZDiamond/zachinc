/**
 * Shown instead of a stack trace when the deployment is missing configuration.
 * Names the exact variables so the fix is obvious from the page itself.
 */
export default function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <>
      <header className="top">
        <div className="wordmark">
          Zach <span>Inc.</span>
        </div>
        <div className="phase">Setup incomplete</div>
      </header>
      <div className="banner" style={{ paddingBottom: 30 }}>
        <h1>Not configured yet.</h1>
        <p>
          The deployment is missing {missing.length} environment variable
          {missing.length === 1 ? "" : "s"}. Add {missing.length === 1 ? "it" : "them"} in Vercel
          under Settings, Environment Variables, then redeploy. Vercel does not apply new variables
          to an existing deployment.
        </p>
      </div>
      <section>
        <div className="sec-h">
          <h2>Missing</h2>
          <span className="sec-note">all environments</span>
        </div>
        <div className="blocks">
          {missing.map((m) => (
            <div className="blk" key={m}>
              <span className="b-name" style={{ width: "auto", fontFamily: "var(--mono)", fontSize: 14 }}>
                {m}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
