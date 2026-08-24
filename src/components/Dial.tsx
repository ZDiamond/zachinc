/** The 90-day dial. Ninety ticks, one per day, heavier every thirty. */
export default function Dial({ dayNum, progress }: { dayNum: number; progress: number }) {
  const R = 74;
  const C = 2 * Math.PI * R;
  const ticks = [];
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * 2 * Math.PI - Math.PI / 2;
    const big = i % 30 === 0;
    const r1 = big ? 62 : 67;
    const r2 = 72;
    ticks.push(
      <line
        key={i}
        x1={90 + r1 * Math.cos(a)}
        y1={90 + r1 * Math.sin(a)}
        x2={90 + r2 * Math.cos(a)}
        y2={90 + r2 * Math.sin(a)}
        stroke={big ? "#A67C3D" : "#C9C7BB"}
        strokeWidth={big ? 2 : 1}
      />
    );
  }
  const shown = Math.max(0, Math.min(dayNum, 90));
  const off = C * (1 - Math.max(0, Math.min(progress, 1)));

  return (
    <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label={`Day ${shown} of 90`}>
      <circle cx="90" cy="90" r={R} fill="none" stroke="#DDDBD0" strokeWidth="7" />
      <circle
        className="dial-fill"
        cx="90"
        cy="90"
        r={R}
        fill="none"
        stroke="#2D4A3A"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={off}
        transform="rotate(-90 90 90)"
      />
      {ticks}
      <text
        x="90" y="84" textAnchor="middle"
        fontFamily="Barlow Condensed,sans-serif" fontWeight="600" fontSize="40" fill="#1F2420"
      >
        {shown}
      </text>
      <text
        x="90" y="106" textAnchor="middle"
        fontFamily="IBM Plex Mono,monospace" fontSize="11" fill="#6E6F66"
      >
        OF 90 DAYS
      </text>
    </svg>
  );
}
