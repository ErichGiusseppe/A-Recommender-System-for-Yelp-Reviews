import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBusinesses } from "../hooks/useApi";
import type { TasteProfile, SignalWeights } from "../types";
import RadarChart from "../components/RadarChart";
import SignalControl from "../components/SignalControl";
import CategoryDot from "../components/ui/CategoryDot";

const TASTE_ROWS = [
  { k: "italian" as const, label: "Italian" },
  { k: "asian" as const, label: "Asian" },
  { k: "cozy" as const, label: "Cozy" },
  { k: "lively" as const, label: "Lively" },
  { k: "cheap" as const, label: "Cheap eats" },
  { k: "special" as const, label: "Special occasion" },
];

export default function Explain() {
  const navigate = useNavigate();
  const { id: _businessId } = useParams<{ id?: string }>();
  const { data: businesses } = useBusinesses();

  const [taste, setTaste] = useState<TasteProfile>({
    italian: 80, asian: 65, cozy: 90, lively: 50, cheap: 35, special: 75,
  });
  const [weights, setWeights] = useState<SignalWeights>({
    cf: 60, ctx: 25, pop: 15,
  });

  const scored = useMemo(() => {
    return businesses.map((b) => {
      const tagBoost = (b.tags || []).reduce((acc, t) => {
        if (t === "cozy") return acc + (taste.cozy - 50) * 0.4;
        if (t === "lively") return acc + (taste.lively - 50) * 0.4;
        if (t === "italian") return acc + (taste.italian - 50) * 0.5;
        if (t === "asian") return acc + (taste.asian - 50) * 0.5;
        if (t === "cheap eats") return acc + (taste.cheap - 50) * 0.4;
        if (t === "special occasion") return acc + (taste.special - 50) * 0.4;
        return acc;
      }, 0);
      const cfScore = (b.cf + tagBoost) * (weights.cf / 100);
      const ctxScore = b.ctx * (weights.ctx / 100);
      const popScore = b.pop * (weights.pop / 100);
      return { ...b, score: cfScore + ctxScore + popScore };
    }).sort((a, b) => b.score - a.score);
  }, [taste, weights, businesses]);

  const inList = scored.slice(0, 4);
  const outList = scored.slice(-3);

  return (
    <div className="mx-auto px-4 sm:px-8 pt-8" style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div className="pb-10">
        <div
          className="font-sans text-[11px] uppercase tracking-[0.22em] mb-3"
          style={{ color: "#C2410C" }}
        >
          Scrutability · The hybrid model, opened up
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-end">
          <h1
            className="md:col-span-7 font-serif"
            style={{
              color: "#1C1917",
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: 1,
              letterSpacing: "-0.025em",
              fontWeight: 400,
            }}
          >
            How we picked these.{" "}
            <span style={{ fontStyle: "italic", color: "#C2410C" }}>Tune it.</span>
          </h1>
          <p
            className="md:col-span-5 font-serif italic"
            style={{ color: "#78716C", fontSize: 17, lineHeight: 1.5 }}
          >
            Move the dials on the right. The list updates as you go. This is your model now —
            we're just keeping the lights on.
          </p>
        </div>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pb-16">
        {/* Column 1 — Taste graph */}
        <div
          className="rounded-xl p-6"
          style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
        >
          <div
            className="font-sans text-[11px] uppercase tracking-[0.18em] mb-1"
            style={{ color: "#78716C" }}
          >
            Your taste graph
          </div>
          <h2
            className="font-serif mb-5"
            style={{ color: "#1C1917", fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            Six dimensions, one shape.
          </h2>

          <RadarChart taste={taste} />

          <div
            className="mt-4 pt-4 space-y-2.5"
            style={{ borderTop: "1px solid #E7E5E4" }}
          >
            {TASTE_ROWS.map((row) => (
              <div key={row.k} className="flex items-center gap-3">
                <span
                  className="font-sans text-[12px] w-32"
                  style={{ color: "#1C1917" }}
                >
                  {row.label}
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={taste[row.k]}
                  onChange={(e) => setTaste({ ...taste, [row.k]: +e.target.value })}
                  className="flex-1 lantern-slider"
                />
                <span
                  className="font-sans text-[11px] tabular-nums w-8 text-right"
                  style={{ color: "#78716C" }}
                >
                  {taste[row.k]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 — Signal weights */}
        <div
          className="rounded-xl p-6"
          style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
        >
          <div
            className="font-sans text-[11px] uppercase tracking-[0.18em] mb-1"
            style={{ color: "#78716C" }}
          >
            What we used for this recommendation
          </div>
          <h2
            className="font-serif mb-5"
            style={{ color: "#1C1917", fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            The hybrid mix.
          </h2>

          <SignalControl
            kind="cf"
            label="Collaborative filtering"
            sub="Matrix factorization · learns from users with similar taste"
            value={weights.cf}
            onChange={(v) => setWeights({ ...weights, cf: v })}
            example="Users who loved Otello also loved A Mano and Suraya"
          />
          <SignalControl
            kind="ctx"
            label="Context-sensitive signals"
            sub="Time of day · weather · location · party size"
            value={weights.ctx}
            onChange={(v) => setWeights({ ...weights, ctx: v })}
            example="It's 47°F. Cozy rooms get a +12% boost."
          />
          <SignalControl
            kind="pop"
            label="Popularity & trending"
            sub="Reservation velocity · review momentum"
            value={weights.pop}
            onChange={(v) => setWeights({ ...weights, pop: v })}
            example="High Street rose 23% in bookings this week"
          />

          {/* Current mix bar */}
          {(() => {
            const total = weights.cf + weights.ctx + weights.pop || 1;
            const pct = {
              cf:  Math.round(weights.cf  / total * 100),
              ctx: Math.round(weights.ctx / total * 100),
              pop: Math.round(weights.pop / total * 100),
            };
            return (
              <div className="mt-4 p-4 rounded-lg" style={{ background: "#FAF6F0" }}>
                <div
                  className="font-sans text-[10px] uppercase tracking-[0.16em] mb-2"
                  style={{ color: "#78716C" }}
                >
                  Current mix
                </div>
                <div
                  className="flex h-2.5 rounded-full overflow-hidden"
                  style={{ border: "1px solid #E7E5E4" }}
                >
                  <div style={{ width: `${pct.cf}%`, background: "#C2410C" }} />
                  <div style={{ width: `${pct.ctx}%`, background: "#115E59" }} />
                  <div style={{ width: `${pct.pop}%`, background: "#EAB308" }} />
                </div>
                <div
                  className="flex justify-between font-sans text-[11px] tabular-nums mt-2"
                  style={{ color: "#78716C" }}
                >
                  <span className="flex items-center gap-1">
                    <CategoryDot kind="cf" /> {pct.cf}%
                  </span>
                  <span className="flex items-center gap-1">
                    <CategoryDot kind="ctx" /> {pct.ctx}%
                  </span>
                  <span className="flex items-center gap-1">
                    <CategoryDot kind="pop" /> {pct.pop}%
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Column 3 — Live preview */}
        <div>
          <div
            className="rounded-xl p-6"
            style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
          >
            <div
              className="font-sans text-[11px] uppercase tracking-[0.18em] mb-1"
              style={{ color: "#78716C" }}
            >
              What this changes
            </div>
            <h2
              className="font-serif mb-1"
              style={{ color: "#1C1917", fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em" }}
            >
              Live recommendations.
            </h2>
            <p className="font-sans text-[12px] mb-5" style={{ color: "#78716C" }}>
              These four rise to the top with your current settings.
            </p>

            <div className="space-y-3">
              {inList.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/business/${b.id}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all hover:-translate-y-[1px]"
                  style={{ background: "#FAF6F0", border: "1px solid #E7E5E4" }}
                >
                  <div
                    className="font-serif italic text-[20px] w-6 text-center tabular-nums shrink-0"
                    style={{ color: "#C2410C" }}
                  >
                    {i + 1}
                  </div>
                  <img
                    src={b.image}
                    alt={b.name}
                    className="w-12 h-12 rounded-md object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-serif truncate"
                      style={{ color: "#1C1917", fontSize: 15, fontWeight: 500 }}
                    >
                      {b.name}
                    </div>
                    <div
                      className="font-sans text-[10px] uppercase tracking-[0.14em] truncate"
                      style={{ color: "#78716C" }}
                    >
                      {b.category} · {b.neighborhood}
                    </div>
                  </div>
                  <div
                    className="font-sans text-[11px] tabular-nums shrink-0"
                    style={{ color: "#C2410C", fontWeight: 600 }}
                  >
                    {Math.round(b.score)}
                  </div>
                </button>
              ))}
            </div>

            {/* Falling out */}
            <div className="mt-5 pt-5" style={{ borderTop: "1px dashed #E7E5E4" }}>
              <div
                className="font-sans text-[10px] uppercase tracking-[0.16em] mb-3"
                style={{ color: "#78716C" }}
              >
                Falling out of your top picks
              </div>
              <div className="space-y-2">
                {outList.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 opacity-50">
                    <img
                      src={b.image}
                      alt={b.name}
                      className="w-9 h-9 rounded-md object-cover grayscale shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-[13px] truncate" style={{ color: "#1C1917" }}>
                        {b.name}
                      </div>
                      <div className="font-sans text-[10px]" style={{ color: "#78716C" }}>
                        {b.category}
                      </div>
                    </div>
                    <span className="font-sans text-[11px] shrink-0" style={{ color: "#78716C" }}>
                      ↓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dark Editor's note */}
          <div
            className="mt-5 p-5 rounded-xl"
            style={{ background: "#1C1917", color: "#FAF6F0" }}
          >
            <div
              className="font-sans text-[10px] uppercase tracking-[0.18em] mb-2"
              style={{ color: "#FED7AA" }}
            >
              Editor's note
            </div>
            <p className="font-serif italic" style={{ fontSize: 16, lineHeight: 1.5 }}>
              "A good recommendation is one you can argue with. Move the dials. Tell us we're
              wrong."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
