import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Business } from "../types";
import CategoryDot from "./ui/CategoryDot";

// ── Live contextual score (mirrors contextual_scorer.py + Explain.tsx) ───────

const CTX_BOOSTS: Record<string, Record<string, number>> = {
  morning:   { "breakfast-and-brunch": 85, "coffee-and-tea": 90, "cafes": 80, "bakeries": 75, "donuts": 70 },
  lunch:     { "sandwiches": 80, "fast-food": 70, "food-trucks": 75, "tacos": 75, "salad": 72, "soup": 68 },
  afternoon: { "coffee-and-tea": 80, "cafes": 75, "desserts": 75, "ice-cream-and-frozen-yogurt": 75 },
  dinner:    { "italian": 80, "steakhouses": 85, "seafood": 80, "pizza": 72, "sushi-bars": 78, "mediterranean": 75 },
  latenight: { "pizza": 85, "bars": 80, "fast-food": 72, "diners": 78, "pubs": 75, "lounges": 70 },
};

function getTimeSlot(hour: number): string {
  if (hour >= 6  && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "dinner";
  return "latenight";
}

function computeCtxScore(tags: string[], hour: number): number {
  const boosts = CTX_BOOSTS[getTimeSlot(hour)] ?? {};
  let best = 0;
  for (const tag of tags) {
    if (boosts[tag] !== undefined) best = Math.max(best, boosts[tag]);
  }
  return best;
}

interface ExplanationCardProps {
  b: Business;
}

// ── Plain-language copy ──────────────────────────────────────────────────────

function friendlyHeadline(cfPct: number, cbPct: number, ctxPct: number, popPct: number): string {
  if (cfPct === 0 && cbPct === 0 && ctxPct === 0 && popPct === 0)
    return "A well-regarded spot in this area.";
  if (cfPct >= cbPct && cfPct >= ctxPct && cfPct >= popPct)
    return "We think you'll really enjoy this one.";
  if (cbPct >= ctxPct && cbPct >= popPct)
    return "This matches exactly what you told us you like.";
  if (ctxPct >= popPct)
    return "This fits exactly what you're looking for right now.";
  return "A lot of people around here are loving this place.";
}

const FRIENDLY_LINES = {
  cf: {
    label: (pct: number) =>
      pct > 0
        ? "People with similar tastes gave this high marks"
        : "No taste history yet — explore more to improve this",
    sub: "Based on people who enjoy the same things as you",
  },
  cb: {
    label: (pct: number) =>
      pct > 0
        ? "The menu and vibe match what you told us you're looking for"
        : "Complete your taste profile to activate this signal",
    sub: "Based on your preferences from the setup questions",
  },
  ctx: {
    label: (pct: number) =>
      pct > 0
        ? "It matches your occasion, time of day, and budget"
        : "Tell us your plans to activate this signal",
    sub: "Based on what you told us about tonight",
  },
  pop: {
    label: (pct: number) =>
      pct > 0
        ? "It's getting a lot of attention in this neighborhood lately"
        : "Not enough local activity to measure yet",
    sub: "Based on how busy and talked-about this place has been",
  },
};

// ── Technical copy ───────────────────────────────────────────────────────────

const TECHNICAL_LINES = {
  cf: {
    label: (pct: number) =>
      pct > 0 ? "Collaborative filter — users with your latent profile" : "CF · no interaction history",
    sub: "SVD++ matrix factorization · k=50 latent factors · weight 0.60",
  },
  cb: {
    label: (pct: number) =>
      pct > 0 ? "Content-based filter — TF-IDF profile similarity" : "CB · no cold-start profile set",
    sub: "TF-IDF (500 features) · category / price / stars · progressive cold→warm blend",
  },
  ctx: {
    label: (pct: number) =>
      pct > 0 ? "Context signal — time-of-day category boost" : "CTX · off-peak for this category",
    sub: "Rule-based time-slot boosts · morning / lunch / afternoon / dinner / latenight",
  },
  pop: {
    label: (pct: number) =>
      pct > 0 ? "Popularity prior — review velocity score" : "POP · insufficient local signal",
    sub: "Review velocity · 14-day rolling window · weight 0.15",
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ExplanationCard({ b }: ExplanationCardProps) {
  const navigate = useNavigate();
  const [feedback, setFeedback]     = useState<"up" | "down" | null>(null);
  const [technical, setTechnical]   = useState(false);

  // Use the higher of server-stored ctx and live tag-based computation so CTX is
  // non-zero whenever the business fits the current time slot, even if it wasn't
  // in the user's precomputed top-N parquet.
  const liveCtx = useMemo(
    () => computeCtxScore(b.tags ?? [], new Date().getHours()),
    [b.tags],
  );
  const ctxEff = Math.max(b.ctx, liveCtx);

  const total  = b.cf + (b.cb ?? 0) + ctxEff + b.pop || 1;
  const cfPct  = (b.cf        / total) * 100;
  const cbPct  = ((b.cb ?? 0) / total) * 100;
  const ctxPct = (ctxEff      / total) * 100;
  const popPct = (b.pop       / total) * 100;

  // Only render rows where the signal is actually contributing (> 0).
  const activeSignals = (["cf", "cb", "ctx", "pop"] as const).filter(kind => {
    const pct = kind === "cf" ? cfPct : kind === "cb" ? cbPct : kind === "ctx" ? ctxPct : popPct;
    return pct > 0;
  });

  const lines = technical ? TECHNICAL_LINES : FRIENDLY_LINES;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
    >
      {/* Header */}
      <div className="mb-4">
        <div
          className="font-sans text-[11px] uppercase tracking-[0.18em] mb-1.5"
          style={{ color: "#C2410C" }}
        >
          Why we recommend this
        </div>
        <div
          className="font-serif"
          style={{ color: "#1C1917", fontSize: 20, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.01em" }}
        >
          {technical
            ? <><span className="tabular-nums">{b.match}%</span> match · {friendlyHeadline(cfPct, cbPct, ctxPct, popPct)}</>
            : friendlyHeadline(cfPct, cbPct, ctxPct, popPct)
          }
        </div>
        {technical && (
          <div
            className="font-sans text-[11px] mt-2 px-3 py-2 rounded-lg"
            style={{ background: "#FAF6F0", color: "#78716C", fontFamily: "monospace" }}
          >
            score = 0.60 × (CF + CB blend) + 0.25 × CTX + 0.15 × POP
          </div>
        )}
      </div>

      {/* Stacked bar */}
      <div
        className="rounded-md overflow-hidden flex h-2.5 mb-1"
        style={{ border: "1px solid #E7E5E4" }}
      >
        <div style={{ width: `${cfPct}%`,  background: "#C2410C" }} />
        <div style={{ width: `${cbPct}%`,  background: "#6366F1" }} />
        <div style={{ width: `${ctxPct}%`, background: "#115E59" }} />
        <div style={{ width: `${popPct}%`, background: "#EAB308" }} />
      </div>
      <div
        className="flex justify-between font-sans text-[10px] uppercase tracking-wider mb-4"
        style={{ color: "#A8A29E" }}
      >
        <span>{technical ? "Hybrid signal mix" : "How we scored this"}</span>
        <span className="flex gap-3">
          <span style={{ color: "#C2410C" }}>■ Taste</span>
          <span style={{ color: "#6366F1" }}>■ Content</span>
          <span style={{ color: "#115E59" }}>■ Context</span>
          <span style={{ color: "#EAB308" }}>■ Popularity</span>
        </span>
      </div>

      {/* Signal lines */}
      <div className="space-y-4 mb-5">
        {activeSignals.map((kind) => {
          const pct   = kind === "cf" ? cfPct : kind === "cb" ? cbPct : kind === "ctx" ? ctxPct : popPct;
          const color = kind === "cf" ? "#C2410C" : kind === "cb" ? "#6366F1" : kind === "ctx" ? "#115E59" : "#EAB308";
          const info  = lines[kind];
          return (
            <div key={kind} className="flex gap-3">
              <div className="pt-1">
                <CategoryDot kind={kind} />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="font-sans text-[13px]"
                    style={{ color: "#1C1917", lineHeight: 1.4 }}
                  >
                    {info.label(pct)}
                  </span>
                  <span
                    className="font-sans text-[12px] tabular-nums shrink-0 font-semibold"
                    style={{ color }}
                  >
                    {Math.round(pct)}%
                  </span>
                </div>
                <div
                  className="font-sans text-[11px] mt-0.5"
                  style={{ color: "#A8A29E" }}
                >
                  {info.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-4"
        style={{ borderTop: "1px solid #E7E5E4" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFeedback("up")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: feedback === "up" ? "#115E59" : "#FAF6F0",
              border: `1px solid ${feedback === "up" ? "#115E59" : "#E7E5E4"}`,
              color:  feedback === "up" ? "white" : "#1C1917",
            }}
            title="This recommendation makes sense"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 11v9H4v-9zM7 11l4-9c1.7 0 3 1.3 3 3v3h5c1.1 0 2 .9 2 2l-2 8c-.2.9-1 1.5-1.9 1.5H7" />
            </svg>
          </button>
          <button
            onClick={() => setFeedback("down")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: feedback === "down" ? "#1C1917" : "#FAF6F0",
              border: `1px solid ${feedback === "down" ? "#1C1917" : "#E7E5E4"}`,
              color:  feedback === "down" ? "white" : "#1C1917",
            }}
            title="Not what I was expecting"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: "rotate(180deg)" }}>
              <path d="M7 11v9H4v-9zM7 11l4-9c1.7 0 3 1.3 3 3v3h5c1.1 0 2 .9 2 2l-2 8c-.2.9-1 1.5-1.9 1.5H7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTechnical(t => !t)}
            className="font-sans text-[11px] px-2.5 py-1 rounded-full transition-all"
            style={{
              background: technical ? "#1C1917" : "#FAF6F0",
              color:      technical ? "#FAF6F0" : "#78716C",
              border:     "1px solid #E7E5E4",
            }}
          >
            {technical ? "⚙ Technical" : "⚙ How it works"}
          </button>
          <button
            onClick={() => navigate(`/explain/${b.id}`)}
            className="font-sans text-[12px] hover:underline"
            style={{ color: "#C2410C", fontWeight: 500 }}
          >
            Adjust →
          </button>
        </div>
      </div>
    </div>
  );
}
