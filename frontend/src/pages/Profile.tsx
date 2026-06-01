import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMe, useSavedBusinesses, useMyReviews } from "../hooks/useApi";
import { useAuth } from "../contexts/AuthContext";
import Rating from "../components/ui/Rating";
import Stat from "../components/ui/Stat";
import type { SeasonBar } from "../types";

const DEFAULT_BARS: SeasonBar[] = [
  { label: "Italian",   value: 28 },
  { label: "Wine bars", value: 22 },
  { label: "Cocktails", value: 18 },
  { label: "Brunch",    value: 14 },
  { label: "Coffee",    value: 11 },
  { label: "Asian",     value: 7 },
];

const BAR_COLORS = ["#C2410C", "#115E59", "#EAB308", "#78716C", "#78716C", "#78716C"];

const TABS = ["Saved", "Reviews"] as const;
type Tab = typeof TABS[number];

export default function Profile() {
  const navigate  = useNavigate();
  const { user: authUser } = useAuth();
  const { data: me }      = useMe();
  const { data: saved }   = useSavedBusinesses(me.saved_business_ids);
  const { data: reviews } = useMyReviews();
  const [activeTab, setActiveTab]       = useState<Tab>("Saved");
  const [reviewsPage, setReviewsPage]   = useState(1);
  const REVIEWS_PER_PAGE = 20;

  const displayName = authUser?.name ?? me.name;
  const nameParts   = displayName.split(" ");
  const firstName   = nameParts[0];
  const lastName    = nameParts.slice(1).join(" ");
  const initials    = nameParts.map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const seasonBars: SeasonBar[] =
    me.season_taste && me.season_taste.length > 0 ? me.season_taste : DEFAULT_BARS;
  const maxBarVal = Math.max(...seasonBars.map((r) => r.value), 1);

  const visibleReviews = reviews.slice(0, reviewsPage * REVIEWS_PER_PAGE);
  const hasMoreReviews = visibleReviews.length < reviews.length;

  return (
    <div className="mx-auto px-4 sm:px-8 pt-8" style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div
        className="grid grid-cols-1 sm:grid-cols-12 gap-8 sm:gap-10 pb-12"
        style={{ borderBottom: "1px solid #E7E5E4" }}
      >
        <div className="sm:col-span-3">
          <div
            className="aspect-square rounded-2xl flex items-center justify-center"
            style={{
              background: "#1C1917",
              boxShadow: "0 8px 32px rgba(28,25,23,0.10)",
            }}
          >
            <span
              className="font-serif text-[64px]"
              style={{ color: "#FAF6F0", fontStyle: "italic" }}
            >
              {initials}
            </span>
          </div>
        </div>
        <div className="sm:col-span-9 flex flex-col justify-end">
          <div
            className="font-sans text-[11px] uppercase tracking-[0.22em] mb-3"
            style={{ color: "#C2410C" }}
          >
            Member since {me.member_since} · {me.location}
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
            <span style={{ fontStyle: "italic" }}>{firstName}</span> {lastName}
          </h1>
          <p
            className="font-serif italic mt-4 max-w-[640px]"
            style={{ color: "#78716C", fontSize: 18, lineHeight: 1.5 }}
          >
            {me.bio}
          </p>

          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mt-8 pt-8"
            style={{ borderTop: "1px solid #E7E5E4" }}
          >
            <Stat n={me.stats.saved} label="Places saved" />
            <Stat n={me.stats.reviews} label="Reviews left" />
            <Stat n={me.stats.cities} label="Cities visited" />
            <Stat n={me.stats.avg_rating} label="Avg. rating given" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 mt-8 mb-8 overflow-x-auto"
        style={{ borderBottom: "1px solid #E7E5E4" }}
      >
        {TABS.map((t) => {
          const active = t === activeTab;
          return (
            <button
              key={t}
              onClick={() => { setActiveTab(t); setReviewsPage(1); }}
              className="font-sans text-[13px] px-4 py-3 relative transition-colors whitespace-nowrap"
              style={{ color: active ? "#1C1917" : "#78716C", fontWeight: active ? 500 : 400 }}
            >
              {t}
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "#C2410C" }}
                />
              )}
            </button>
          );
        })}
        <span className="ml-auto font-sans text-[12px] shrink-0" style={{ color: "#78716C" }}>
          <span className="tabular-nums" style={{ color: "#1C1917", fontWeight: 500 }}>
            {activeTab === "Saved" ? saved.length : reviews.length}
          </span>{" "}
          {activeTab === "Saved" ? `of ${me.stats.saved} shown` : "reviews"}
        </span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.42fr] gap-8 lg:gap-10 pb-16">
        {/* Tab content */}
        <div>
          {activeTab === "Saved" && (
            saved.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: "#78716C" }}>
                <div className="font-serif italic text-[18px] mb-2">Loading your top picks…</div>
                <div className="font-sans text-[12px]" style={{ color: "#A8A29E" }}>Your saved places will appear here.</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {saved.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/business/${b.id}`)}
                    className="text-left transition-all hover:-translate-y-[2px] group"
                  >
                    <div className="aspect-[4/5] rounded-xl overflow-hidden relative">
                      <img src={b.image} alt={b.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                      <div className="absolute top-3 right-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.92)" }}>
                          <span style={{ color: "#C2410C" }}>♥</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-serif truncate" style={{ color: "#1C1917", fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em" }}>{b.name}</h3>
                        <span className="font-sans text-[11px] tabular-nums" style={{ color: "#78716C" }}>{b.price}</span>
                      </div>
                      <div className="font-sans text-[11px] uppercase tracking-[0.14em] mt-1" style={{ color: "#78716C" }}>{b.category} · {b.city}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <Rating value={b.rating} />
                        <span className="font-sans text-[11px] tabular-nums" style={{ color: "#78716C" }}>· {b.reviews}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {activeTab === "Reviews" && (
            reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: "#78716C" }}>
                <div className="font-serif italic text-[18px] mb-2">No reviews yet.</div>
                <div className="font-sans text-[12px]" style={{ color: "#A8A29E" }}>Rate a place from its detail page and it will show up here.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleReviews.map((r) => (
                  <div key={r.business_id} className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <button
                        onClick={() => navigate(`/business/${r.business_id}`)}
                        className="font-serif text-[16px] hover:underline text-left"
                        style={{ color: "#1C1917", fontWeight: 500 }}
                      >
                        {r.business_name || r.business_id}
                      </button>
                      <Rating value={r.stars} />
                    </div>
                    {r.text && (
                      <p className="font-serif italic text-[14px]" style={{ color: "#78716C", lineHeight: 1.6 }}>"{r.text}"</p>
                    )}
                    <div className="font-sans text-[11px] mt-3" style={{ color: "#A8A29E" }}>
                      {new Date(r.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                    </div>
                  </div>
                ))}

                {hasMoreReviews && (
                  <button
                    onClick={() => setReviewsPage(p => p + 1)}
                    className="w-full py-3 rounded-xl font-sans text-[13px] transition-colors"
                    style={{ border: "1px solid #E7E5E4", color: "#78716C", background: "#FAFAF9" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#C2410C")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#E7E5E4")}
                  >
                    Load {Math.min(REVIEWS_PER_PAGE, reviews.length - visibleReviews.length)} more
                    <span style={{ color: "#A8A29E" }}> · {reviews.length - visibleReviews.length} remaining</span>
                  </button>
                )}
              </div>
            )
          )}
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
              {seasonBars.map((row, i) => (
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
                        width: `${(row.value / maxBarVal) * 100}%`,
                        background: BAR_COLORS[i] ?? "#78716C",
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
              Based on your top recommendations in Philadelphia.{" "}
              <span style={{ color: "#C2410C" }}>Tune it below.</span>
            </p>

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
              {me.cities_visited.map((c) => (
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
