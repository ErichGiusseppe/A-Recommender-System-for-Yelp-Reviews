import { useNavigate } from "react-router-dom";
import { BUSINESSES, USER } from "../data/mock";
import Rating from "../components/ui/Rating";
import Stat from "../components/ui/Stat";
import type { SeasonBar } from "../types";

const SEASON_BARS: SeasonBar[] = [
  { label: "Italian", value: 28 },
  { label: "Wine bars", value: 22 },
  { label: "Cocktails", value: 18 },
  { label: "Brunch", value: 14 },
  { label: "Coffee", value: 11 },
  { label: "Asian", value: 7 },
];

const BAR_COLORS = ["#C2410C", "#115E59", "#EAB308", "#78716C", "#78716C", "#78716C"];

const TABS = ["Saved", "Reviews", "Lists", "Following"] as const;

export default function Profile() {
  const navigate = useNavigate();
  const saved = USER.saved_business_ids
    .map((id) => BUSINESSES.find((b) => b.id === id))
    .filter(Boolean) as typeof BUSINESSES;

  return (
    <div className="mx-auto px-4 sm:px-8 pt-8" style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div
        className="grid grid-cols-1 sm:grid-cols-12 gap-8 sm:gap-10 pb-12"
        style={{ borderBottom: "1px solid #E7E5E4" }}
      >
        <div className="sm:col-span-3">
          <div
            className="aspect-square rounded-2xl bg-cover bg-center"
            style={{
              backgroundImage: `url(${USER.avatar})`,
              boxShadow: "0 8px 32px rgba(28,25,23,0.10)",
            }}
          />
        </div>
        <div className="sm:col-span-9 flex flex-col justify-end">
          <div
            className="font-sans text-[11px] uppercase tracking-[0.22em] mb-3"
            style={{ color: "#C2410C" }}
          >
            Member since {USER.member_since} · {USER.location}
          </div>
          <h1
            className="font-serif"
            style={{
              color: "#1C1917",
              fontSize: "clamp(48px, 7vw, 80px)",
              lineHeight: 0.95,
              letterSpacing: "-0.025em",
              fontWeight: 400,
            }}
          >
            <span style={{ fontStyle: "italic" }}>{USER.first_name}</span> Restrepo
          </h1>
          <p
            className="font-serif italic mt-4 max-w-[640px]"
            style={{ color: "#78716C", fontSize: 18, lineHeight: 1.5 }}
          >
            {USER.bio}
          </p>

          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mt-8 pt-8"
            style={{ borderTop: "1px solid #E7E5E4" }}
          >
            <Stat n={USER.stats.saved} label="Places saved" />
            <Stat n={USER.stats.reviews} label="Reviews left" />
            <Stat n={USER.stats.cities} label="Cities visited" />
            <Stat n={USER.stats.avg_rating} label="Avg. rating given" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 mt-8 mb-8 overflow-x-auto"
        style={{ borderBottom: "1px solid #E7E5E4" }}
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            className="font-sans text-[13px] px-4 py-3 relative transition-colors whitespace-nowrap"
            style={{
              color: i === 0 ? "#1C1917" : "#78716C",
              fontWeight: i === 0 ? 500 : 400,
            }}
          >
            {t}
            {i === 0 && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "#C2410C" }}
              />
            )}
          </button>
        ))}
        <span className="ml-auto font-sans text-[12px] shrink-0" style={{ color: "#78716C" }}>
          <span
            className="tabular-nums"
            style={{ color: "#1C1917", fontWeight: 500 }}
          >
            {saved.length}
          </span>{" "}
          of {USER.stats.saved} shown
        </span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.42fr] gap-8 lg:gap-10 pb-16">
        {/* Saved grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {saved.map((b) => (
            <button
              key={b.id}
              onClick={() => navigate(`/business/${b.id}`)}
              className="text-left transition-all hover:-translate-y-[2px] group"
            >
              <div className="aspect-[4/5] rounded-xl overflow-hidden relative">
                <img
                  src={b.image}
                  alt={b.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute top-3 right-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.92)" }}
                  >
                    <span style={{ color: "#C2410C" }}>♥</span>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3
                    className="font-serif truncate"
                    style={{
                      color: "#1C1917",
                      fontSize: 18,
                      fontWeight: 500,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {b.name}
                  </h3>
                  <span
                    className="font-sans text-[11px] tabular-nums"
                    style={{ color: "#78716C" }}
                  >
                    {b.price}
                  </span>
                </div>
                <div
                  className="font-sans text-[11px] uppercase tracking-[0.14em] mt-1"
                  style={{ color: "#78716C" }}
                >
                  {b.category} · {b.city}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Rating value={b.rating} />
                  <span
                    className="font-sans text-[11px] tabular-nums"
                    style={{ color: "#78716C" }}
                  >
                    · {b.reviews}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Side panel */}
        <div className="space-y-5">
          {/* Season taste card */}
          <div
            className="rounded-xl p-6"
            style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
          >
            <div
              className="font-sans text-[11px] uppercase tracking-[0.18em] mb-1"
              style={{ color: "#C2410C" }}
            >
              Spring · Issue 04
            </div>
            <h3
              className="font-serif mb-4"
              style={{
                color: "#1C1917",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
              }}
            >
              Your taste this season.
            </h3>

            <div className="space-y-2.5 mt-5">
              {SEASON_BARS.map((row, i) => (
                <div key={row.label}>
                  <div className="flex justify-between font-sans text-[11px] mb-1">
                    <span style={{ color: "#1C1917" }}>{row.label}</span>
                    <span className="tabular-nums" style={{ color: "#78716C" }}>
                      {row.value}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "#FAF6F0" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(row.value / 28) * 100}%`,
                        background: BAR_COLORS[i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p
              className="font-serif italic mt-6 pt-5"
              style={{
                color: "#1C1917",
                fontSize: 14,
                lineHeight: 1.6,
                borderTop: "1px solid #E7E5E4",
              }}
            >
              You leaned hard into pasta and natural wine this spring — 50% of saves were
              Italian or wine bars. Your weekend pattern shifted earlier, with brunch saves up
              38%. We'd guess you're planning a trip to Italy.{" "}
              <span style={{ color: "#C2410C" }}>Are you?</span>
            </p>

            <button
              onClick={() => navigate("/explain")}
              className="font-sans text-[12px] mt-5 hover:underline"
              style={{ color: "#C2410C", fontWeight: 500 }}
            >
              Tune what we recommend →
            </button>
          </div>

          {/* Cities card */}
          <div
            className="rounded-xl p-5"
            style={{ background: "#FAF6F0", border: "1px solid #E7E5E4" }}
          >
            <div
              className="font-sans text-[10px] uppercase tracking-[0.16em] mb-2"
              style={{ color: "#78716C" }}
            >
              Cities you've eaten in
            </div>
            <div className="flex flex-wrap gap-1.5">
              {USER.cities_visited.map((c) => (
                <span
                  key={c}
                  className="font-sans text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: "#FFFFFF", color: "#1C1917", border: "1px solid #E7E5E4" }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
