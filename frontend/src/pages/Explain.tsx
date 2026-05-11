import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBusinesses } from "../hooks/useApi";
import type { TasteProfile, SignalWeights } from "../types";
import RadarChart from "../components/RadarChart";
import SignalControl from "../components/SignalControl";
import CategoryDot from "../components/ui/CategoryDot";

// ── Time-of-day context scoring (mirrors contextual_scorer.py) ───────────────

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

function computeCtx(tags: string[], hour: number): number {
  const boosts = CTX_BOOSTS[getTimeSlot(hour)] || {};
  let best = 20; // baseline: low ctx for off-time businesses
  for (const tag of tags) {
    if (boosts[tag] !== undefined) best = Math.max(best, boosts[tag]);
  }
  return best;
}

// ── Taste → category tag mapping ─────────────────────────────────────────────
// Tags on businesses are hyphenated lowercase Yelp categories (from business_store.py).

const TASTE_TAG_MAP: Record<keyof TasteProfile, string[]> = {
  italian:  ["italian", "pizza", "mediterranean", "french", "spanish"],
  asian:    ["chinese", "japanese", "sushi-bars", "korean", "vietnamese", "thai", "indian", "asian-fusion"],
  cozy:     ["coffee-and-tea", "cafes", "wine-bars", "gastropubs", "desserts"],
  lively:   ["bars", "nightlife", "cocktail-bars", "sports-bars", "lounges"],
  cheap:    ["fast-food", "food-trucks", "sandwiches", "burgers", "tacos"],
  special:  ["steakhouses", "french", "seafood", "mediterranean", "modern-european"],
};

function tasteBoost(tags: string[], taste: TasteProfile): number {
  let boost = 0;
  for (const tag of tags) {
    for (const [key, matchTags] of Object.entries(TASTE_TAG_MAP)) {
      if (matchTags.includes(tag)) {
        boost += (taste[key as keyof TasteProfile] - 50) * 0.25;
      }
    }
  }
  return Math.max(-20, Math.min(20, boost)); // clamp to ±20
}

// ── Taste dimension labels ────────────────────────────────────────────────────

const TASTE_ROWS: { k: keyof TasteProfile; label: string }[] = [
  { k: "italian",  label: "Italian / European" },
  { k: "asian",    label: "Asian cuisines" },
  { k: "cozy",     label: "Cozy & intimate" },
  { k: "lively",   label: "Lively & social" },
  { k: "cheap",    label: "Value picks" },
  { k: "special",  label: "Special occasion" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Explain() {
  const navigate = useNavigate();
  const { id: _businessId } = useParams<{ id?: string }>();
  const { data: businesses } = useBusinesses();

  const currentHour = useMemo(() => new Date().getHours(), []);

  const [taste, setTaste] = useState<TasteProfile>({
    italian: 80, asian: 65, cozy: 90, lively: 50, cheap: 35, special: 75,
  });
  const [weights, setWeights] = useState<SignalWeights>({
    cf: 60, cb: 0, ctx: 25, pop: 15,
  });

  const scored = useMemo(() => {
    const totalW = weights.cf + weights.cb + weights.ctx + weights.pop || 1;
    return businesses
      .map(b => {
        // CF: server-computed SVD++ score + taste alignment boost
        const cfRaw  = Math.min(100, Math.max(0, b.cf + tasteBoost(b.tags || [], taste)));
        // CB: server-computed content-based score (cold-start TF-IDF)
        const cbRaw  = b.cb ?? 0;
        // CTX: time-of-day relevance derived from business tags
        const ctxRaw = computeCtx(b.tags || [], currentHour);
        // POP: server-computed popularity score
        const popRaw = b.pop;

        const score = (cfRaw * weights.cf + cbRaw * weights.cb + ctxRaw * weights.ctx + popRaw * weights.pop) / totalW;
        return { ...b, score: Math.round(score) };
      })
      .sort((a, b) => b.score - a.score);
  }, [taste, weights, businesses, currentHour]);

  const inList   = scored.slice(0, 4);
  const nextList = scored.slice(4, 7); // businesses closest to entering top 4

  const timeSlotLabel: Record<string, string> = {
    morning: "morning", lunch: "lunchtime", afternoon: "afternoon",
    dinner: "dinner", latenight: "late night",
  };

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
            Move the dials. The list updates as you go. This is your model now —
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
            Your taste profile
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
                <span className="font-sans text-[12px] w-36" style={{ color: "#1C1917" }}>
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

          <div
            className="mt-4 pt-3 font-sans text-[11px]"
            style={{ color: "#A8A29E", borderTop: "1px solid #E7E5E4" }}
          >
            Adjusting these shifts the collaborative filter component for matching categories.
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
            Signal weights
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
            sub="SVD++ matrix factorization · learns from users with similar taste"
            value={weights.cf}
            onChange={(v) => setWeights({ ...weights, cf: v })}
            example="People who liked Osteria loved Suraya and A Mano"
          />
          <SignalControl
            kind="ctx"
            label="Context-sensitive signals"
            sub={`Time of day · now it's ${timeSlotLabel[getTimeSlot(currentHour)]}`}
            value={weights.ctx}
            onChange={(v) => setWeights({ ...weights, ctx: v })}
            example={`${getTimeSlot(currentHour) === "morning" ? "Coffee shops" : getTimeSlot(currentHour) === "dinner" ? "Steakhouses" : "Trending spots"} get a boost right now`}
          />
          <SignalControl
            kind="pop"
            label="Popularity & trending"
            sub="Normalized review count · review velocity"
            value={weights.pop}
            onChange={(v) => setWeights({ ...weights, pop: v })}
            example="High Street rose 23% in activity this week"
          />

          {/* Current mix bar */}
          {(() => {
            const total = weights.cf + weights.cb + weights.ctx + weights.pop || 1;
            const pct = {
              cf:  Math.round(weights.cf  / total * 100),
              cb:  Math.round(weights.cb  / total * 100),
              ctx: Math.round(weights.ctx / total * 100),
              pop: Math.round(weights.pop / total * 100),
            };
            return (
              <div className="mt-4 p-4 rounded-lg" style={{ background: "#FAF6F0" }}>
                <div
                  className="font-sans text-[10px] uppercase tracking-[0.16em] mb-2"
                  style={{ color: "#78716C" }}
                >
                  Current mix · sum = {weights.cf + weights.cb + weights.ctx + weights.pop}
                </div>
                <div
                  className="flex h-2.5 rounded-full overflow-hidden"
                  style={{ border: "1px solid #E7E5E4" }}
                >
                  <div style={{ width: `${pct.cf}%`,  background: "#C2410C" }} />
                  <div style={{ width: `${pct.cb}%`,  background: "#6366F1" }} />
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
                    <CategoryDot kind="cb" /> {pct.cb}%
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
              Live ranking.
            </h2>
            <p className="font-sans text-[12px] mb-5" style={{ color: "#78716C" }}>
              These rise to the top with your current settings.
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
                    {b.score}%
                  </div>
                </button>
              ))}
            </div>

            {/* Next in line */}
            <div className="mt-5 pt-5" style={{ borderTop: "1px dashed #E7E5E4" }}>
              <div
                className="font-sans text-[10px] uppercase tracking-[0.16em] mb-3"
                style={{ color: "#78716C" }}
              >
                Next in line — adjust weights to bring these up
              </div>
              <div className="space-y-2">
                {nextList.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/business/${b.id}`)}
                    className="w-full flex items-center gap-3 text-left"
                    style={{ opacity: 0.55 }}
                  >
                    <img
                      src={b.image}
                      alt={b.name}
                      className="w-9 h-9 rounded-md object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-[13px] truncate" style={{ color: "#1C1917" }}>
                        {b.name}
                      </div>
                      <div className="font-sans text-[10px]" style={{ color: "#78716C" }}>
                        {b.category}
                      </div>
                    </div>
                    <span
                      className="font-sans text-[11px] tabular-nums shrink-0"
                      style={{ color: "#78716C" }}
                    >
                      {b.score}%
                    </span>
                  </button>
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
