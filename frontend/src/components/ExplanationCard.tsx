import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Business } from "../types";
import SignalLine from "./SignalLine";

interface ExplanationCardProps {
  b: Business;
}

function dominantLabel(cf: number, ctx: number, pop: number): string {
  if (cf >= ctx && cf >= pop && cf > 0) return "mostly your taste history";
  if (ctx >= pop && ctx > 0)            return "mostly your stated preferences";
  if (pop > 0)                          return "mostly what's trending here";
  return "popular in this area";
}

export default function ExplanationCard({ b }: ExplanationCardProps) {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const total = b.cf + b.ctx + b.pop || 1;
  const cfPct = (b.cf / total) * 100;
  const ctxPct = (b.ctx / total) * 100;
  const popPct = (b.pop / total) * 100;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div
            className="font-sans text-[11px] uppercase tracking-[0.18em] mb-1.5"
            style={{ color: "#C2410C" }}
          >
            Why we recommend this
          </div>
          <div
            className="font-serif"
            style={{
              color: "#1C1917",
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            <span className="tabular-nums">{b.match}%</span> for you,
            <br /> {dominantLabel(b.cf, b.ctx, b.pop)}.
          </div>
        </div>
      </div>

      {/* Stacked bar */}
      <div
        className="rounded-md overflow-hidden flex h-3 mb-1"
        style={{ border: "1px solid #E7E5E4" }}
      >
        <div style={{ width: `${cfPct}%`, background: "#C2410C" }} />
        <div style={{ width: `${ctxPct}%`, background: "#115E59" }} />
        <div style={{ width: `${popPct}%`, background: "#EAB308" }} />
      </div>
      <div
        className="flex justify-between font-sans text-[10px] tabular-nums uppercase tracking-wider mb-4"
        style={{ color: "#78716C" }}
      >
        <span>Hybrid signal mix</span>
        <span>100%</span>
      </div>

      {/* Three signal lines */}
      <div className="space-y-3 mb-5">
        <SignalLine
          kind="cf"
          pct={b.cf}
          label="Users with your taste rated it highly"
          sub="Matrix factorization · k=64"
        />
        <SignalLine
          kind="ctx"
          pct={b.ctx}
          label="Open now, walking distance, weather-matched"
          sub="Context signals: time, location, weather"
        />
        <SignalLine
          kind="pop"
          pct={b.pop}
          label="Trending in this neighborhood this week"
          sub="Popularity prior"
        />
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
              color: feedback === "up" ? "white" : "#1C1917",
            }}
            title="Helpful"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 11v9H4v-9zM7 11l4-9c1.7 0 3 1.3 3 3v3h5c1.1 0 2 .9 2 2l-2 8c-.2.9-1 1.5-1.9 1.5H7" />
            </svg>
          </button>
          <button
            onClick={() => setFeedback("down")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: feedback === "down" ? "#1C1917" : "#FAF6F0",
              border: `1px solid ${feedback === "down" ? "#1C1917" : "#E7E5E4"}`,
              color: feedback === "down" ? "white" : "#1C1917",
            }}
            title="Not for me"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: "rotate(180deg)" }}
            >
              <path d="M7 11v9H4v-9zM7 11l4-9c1.7 0 3 1.3 3 3v3h5c1.1 0 2 .9 2 2l-2 8c-.2.9-1 1.5-1.9 1.5H7" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => navigate(`/explain/${b.id}`)}
          className="font-sans text-[12px] hover:underline"
          style={{ color: "#C2410C", fontWeight: 500 }}
        >
          Adjust what matters to me →
        </button>
      </div>
    </div>
  );
}
