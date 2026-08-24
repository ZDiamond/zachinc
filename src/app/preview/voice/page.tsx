import { notFound } from "next/navigation";
import { scoreAngles, readout, type Angle, type Conviction, type Piece } from "@/lib/voice";
import Header from "@/components/Header";
import Convictions from "@/components/Convictions";
import Angles from "@/components/Angles";
import Pieces from "@/components/Pieces";

/** Local-only design preview for the voice experiment. */
export default function VoicePreview() {
  if (process.env.NODE_ENV === "production") notFound();

  const ANGLES: Angle[] = [
    { id: "a1", name: "The operator beat", sort: 0,
      description: "Go and look. Sit with people whose work cannot be digitized and report what it actually costs them.",
      headlines: [
        "The quote is the product",
        "What an HVAC dispatcher does that software cannot",
        "Three hours a day spent proving you showed up",
      ] },
    { id: "a2", name: "Commercial, from the inside", sort: 1,
      description: "Partnership economics, alliance deals, how GSI relationships actually work.",
      headlines: ["Nobody owns the partner number", "The sourced-versus-influenced fight is a governance problem"] },
    { id: "a3", name: "The thesis", sort: 2,
      description: "AI makes cognitive coordination cheap, so presence, craft, taste and judgment get relatively more valuable.",
      headlines: [] },
  ];

  const PIECES: Piece[] = [
    { id: "p1", title: "The quote is the product", angle_id: "a1", status: "shipped",
      shipped_on: "2026-09-02", url: "", wanted_next: true, created_pull: true,
      response_notes: "Two operators replied unprompted. One offered to walk me through his intake." },
    { id: "p2", title: "Nobody owns the partner number", angle_id: "a2", status: "shipped",
      shipped_on: "2026-09-09", url: "", wanted_next: false, created_pull: true, response_notes: "" },
    { id: "p3", title: "What stays expensive", angle_id: "a3", status: "drafting",
      shipped_on: null, url: "", wanted_next: null, created_pull: null, response_notes: "" },
  ];

  const CONVICTIONS: Conviction[] = [
    { id: "c1", text: "Most partner programs are marketing budgets wearing a revenue costume", heat: 5, created_at: "" },
    { id: "c2", text: "The people closest to the physical work are the least listened to about it", heat: 4, created_at: "" },
    { id: "c3", text: "Every founder underestimates how long an alliance takes to pay", heat: 2, created_at: "" },
  ];

  const scores = scoreAngles(ANGLES, PIECES);

  return (
    <>
      <Header dateLabel="Wednesday, September 9, 2026" phase="Finding the voice" active="voice" />
      <section>
        <div className="sec-h">
          <h2>The experiment</h2>
          <span className="sec-note">answered by shipping, not deciding</span>
        </div>
        <p className="readout">{readout(scores)}</p>
      </section>
      <section><Convictions userId="preview" initial={CONVICTIONS} /></section>
      <section><Angles userId="preview" initial={ANGLES} scores={scores} /></section>
      <section><Pieces userId="preview" today="2026-09-09" initial={PIECES} angles={ANGLES} /></section>
    </>
  );
}
