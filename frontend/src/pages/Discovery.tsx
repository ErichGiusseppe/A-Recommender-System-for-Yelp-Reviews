import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBusinesses, useCategories } from "../hooks/useApi";
import { useNeighborhood } from "../contexts/NeighborhoodContext";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import type { Business } from "../types";
import SectionHeader from "../components/SectionHeader";
import PickCard from "../components/cards/PickCard";
import SmallCard from "../components/cards/SmallCard";
import TrendingCard from "../components/cards/TrendingCard";
import WhyPickedPill from "../components/ui/WhyPickedPill";
import ColdStartWizard, {
  type ColdStartProfile,
  profileToParams,
} from "../components/ColdStartWizard";

// ── Hero text per context ────────────────────────────────────────────────────

function heroLabel(profile: ColdStartProfile | null): string {
  if (!profile) return "Tonight in";
  if (profile.occasion === "traveling") return "Best of";
  if (profile.occasion === "date")      return "Tonight in";
  if (profile.timeSlot === "morning")   return "Morning in";
  if (profile.timeSlot === "lunch")     return "Afternoon in";
  if (profile.timeSlot === "latenight") return "Late night in";
  return "Tonight in";
}

function heroSub(profile: ColdStartProfile | null): string {
  if (!profile)
    return "Six rooms worth leaving the house for, picked from your taste graph and tonight's weather.";
  if (profile.occasion === "traveling")
    return "You're passing through — we've raised the bar. These are the places worth your limited time.";
  if (profile.occasion === "date")
    return "No pressure, but these will land. Tuned to your budget and the hour.";
  if (profile.timeSlot === "morning")
    return "Morning picks — coffee worth sitting down for, and tables that set up a good day.";
  if (profile.timeSlot === "latenight")
    return "The night is young. These places hold up after 10.";
  return "Picks tuned to what you told us. Change your mind anytime.";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Discovery() {
  const navigate = useNavigate();
  const { coldStartProfile: profile, setColdStartProfile } = useAuth();
  const { data: businesses } = useBusinesses();
  const { data: categories } = useCategories();
  const { city, neighborhood, openPicker, hasChosen, setCity, setNeighborhood } = useNeighborhood();

  const [showWizard, setShowWizard]   = useState(false);
  const [coldPicks, setColdPicks]     = useState<Business[]>([]);
  const [coldLoading, setColdLoading] = useState(false);

  // Show wizard on every fresh app load (new tab or browser session).
  // sessionStorage is cleared when the tab/browser closes, so this fires
  // once per visit — NOT again when the user navigates between pages.
  const SESSION_KEY = "lantern_session_shown";
  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      const t = setTimeout(() => setShowWizard(true), 400);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only on mount

  // Fetch cold-start recs by fetching each business individually.
  // We can't use the pre-loaded 50 businesses as a map: those are sorted by
  // the user's warm ALS scores, while cold-start returns content-model IDs
  // that almost certainly won't appear in that set.
  const fetchColdStart = useCallback(async (p: ColdStartProfile) => {
    setColdLoading(true);
    try {
      const params = profileToParams(p);
      const resp   = await api.coldStartRecs({ ...params, limit: 20, city: city || undefined });
      // Fetch full business details in parallel for the top 8 results
      const top8   = resp.items.slice(0, 8);
      const results = await Promise.all(
        top8.map(rec =>
          api.business(rec.business_id)
            .then(biz => ({
              ...biz,
              match: Math.min(99, Math.max(1, Math.round(rec.score * 100))),
              cf:  rec.cf,
              ctx: rec.ctx,
              pop: rec.pop,
            }))
            .catch(() => null)
        )
      );
      setColdPicks(results.filter(Boolean) as Business[]);
    } catch {
      setColdPicks([]);
    } finally {
      setColdLoading(false);
    }
  }, [city]);

  useEffect(() => {
    if (profile) fetchColdStart(profile);
  }, [profile, fetchColdStart]);

  // Wizard handlers
  function handleWizardComplete(p: ColdStartProfile) {
    setColdStartProfile(p);
    setShowWizard(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  function handleWizardSkip() {
    setShowWizard(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  function resetProfile() {
    sessionStorage.removeItem(SESSION_KEY);
    setColdPicks([]);
    setShowWizard(true);
  }

  // ── Display data ───────────────────────────────────────────────────────────

  const displayPlace = neighborhood || city || "Philadelphia";

  // The hook already fetches filtered by city + neighborhood, so businesses
  // should only contain the right subset. We still filter client-side as a
  // safety net in case of stale data from a previous city/neighborhood.
  const fallbackBizs = city
    ? businesses.filter(b => b.city === city)
    : businesses.filter(b => b.city === "Philadelphia"); // guest default

  // A warm user is one whose businesses have real CF signal from SVD++.
  // For warm users, SVD++ picks (fallbackBizs, already sorted by match) always win
  // over cold-start picks — the wizard profile may belong to a previous session or
  // a different user (it lives in localStorage and is not cleared on user switch).
  const isWarmUser = fallbackBizs.some(b => b.cf > 10);
  const top = (profile && coldPicks.length && !isWarmUser ? coldPicks : fallbackBizs).slice(0, 4);
  // Trending: skip low-rated places — a 2.5★ place shouldn't be "trending"
  const trending = fallbackBizs.filter(b => b.rating >= 3.5).slice(0, 3);

  // "Because you liked" — group high-CF businesses by specific category, pick the dominant
  // category randomly at page load, show same-category recommendations.
  // Generic categories (Food, Restaurants, Bars…) are excluded so the anchor is always
  // a recognisable, specific type of place.
  const GENERIC_CATS = new Set([
    "Restaurants", "Food", "Nightlife", "Bars", "Shopping",
    "Local Services", "Home Services", "Health & Medical", "Automotive",
  ]);

  const becauseLikedCategory = useMemo(() => {
    // Anchor must have a strong CF signal (real SVD++ history)
    const strongCf = fallbackBizs.filter(b => b.cf > 50);
    if (!strongCf.length) return null;

    // Group by primary category, skipping generic ones
    const byCategory: Record<string, { anchor: typeof strongCf[0]; recs: typeof strongCf }> = {};
    for (const b of strongCf) {
      if (GENERIC_CATS.has(b.category)) continue;
      if (!byCategory[b.category]) byCategory[b.category] = { anchor: b, recs: [] };
      byCategory[b.category].recs.push(b);
    }

    // Build the wider pool (CF > 20) per category and require at least 3 total
    // (anchor + 2 recs minimum) so the section always shows a full row.
    const qualified = Object.entries(byCategory)
      .map(([cat, { recs }]) => {
        const anchor = [...recs].sort((a, b) => b.cf - a.cf)[0];
        const pool   = fallbackBizs
          .filter(b => b.cf > 20 && b.category === cat)
          .sort((a, b) => b.cf - a.cf);
        return { category: cat, anchor, pool };
      })
      .filter(({ pool }) => pool.length >= 3) // need anchor + at least 2 recs
      .sort((a, b) => b.pool.length - a.pool.length)
      .slice(0, 3); // top 3 qualifying categories

    if (!qualified.length) return null;

    // Pick randomly among qualifying categories — stable per business-list change
    const picked = qualified[Math.floor(Math.random() * qualified.length)];
    return { category: picked.category, anchor: picked.anchor, recs: picked.pool };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackBizs.map(b => b.id).join(",")]);

  const becauseLiked = becauseLikedCategory?.anchor ?? null;
  const becauseList  = becauseLikedCategory
    ? becauseLikedCategory.recs.filter(b => b.id !== becauseLiked?.id).slice(0, 3)
    : [];

  // Hidden gems: high rating, fewest reviews (less-discovered places)
  const hiddenGems = [...fallbackBizs]
    .filter(b => b.rating >= 4.5)
    .sort((a, b) => a.reviews - b.reviews)
    .slice(0, 3);

  // Best value: only businesses where we actually know the price is $ or $$
  // (priceKnown=false means the dataset had no price data — we assigned "$$" as a default,
  //  which is not enough signal to claim something is affordable)
  const bestValue = [...fallbackBizs]
    .filter(b => b.priceKnown && (b.price === "$" || b.price === "$$"))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const hasPersonalization = profile !== null;

  return (
    <>
      {/* Cold-start wizard overlay */}
      {showWizard && (
        <ColdStartWizard
          onComplete={handleWizardComplete}
          onSkip={handleWizardSkip}
          initialProfile={profile}
          showCityStep={!hasChosen}
          onCitySelect={(c, n) => { setCity(c); if (n) setNeighborhood(n); }}
        />
      )}

      <div className="mx-auto px-4 sm:px-8 pt-10" style={{ maxWidth: 1280 }}>
        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-16">
          <div className="md:col-span-7 flex flex-col justify-end">
            <div
              className="font-sans text-[11px] uppercase tracking-[0.22em] mb-5 flex items-center gap-2"
              style={{ color: "#78716C" }}
            >
              <span>☾ &nbsp;Tonight ·</span>
              <button
                onClick={openPicker}
                className="flex items-center gap-1 font-sans text-[11px] uppercase tracking-[0.22em] transition-colors hover:opacity-70"
                style={{ color: "#C2410C" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                {displayPlace}
              </button>
            </div>

            <h1
              className="font-serif"
              style={{
                color: "#1C1917",
                fontSize: "clamp(52px, 8vw, 88px)",
                lineHeight: 0.94,
                letterSpacing: "-0.025em",
                fontWeight: 400,
              }}
            >
              {heroLabel(profile)}
              <br />
              <span style={{ fontStyle: "italic", color: "#C2410C" }}>{displayPlace}</span>
              <span style={{ color: "#1C1917" }}>.</span>
            </h1>

            <p
              className="font-serif italic mt-7 max-w-[520px]"
              style={{ color: "#78716C", fontSize: 19, lineHeight: 1.55 }}
            >
              {heroSub(profile)}
            </p>

            <div className="flex items-center gap-3 mt-8 flex-wrap">
              <button
                onClick={() => navigate("/search")}
                className="font-sans text-[13px] font-medium px-5 py-2.5 rounded-full transition-all hover:-translate-y-[2px]"
                style={{ background: "#1C1917", color: "#FAF6F0" }}
              >
                Browse all recommendations
              </button>
              {/* Personalize / reset */}
              <button
                onClick={resetProfile}
                className="font-sans text-[13px] px-5 py-2.5 rounded-full transition-all hover:-translate-y-[2px]"
                style={{ color: "#78716C", border: "1px solid #E7E5E4", background: "#FFFFFF" }}
              >
                {hasPersonalization ? "Re-tune picks" : "Personalize"}
              </button>
            </div>

            {/* Active profile summary chips */}
            {profile && (
              <div className="flex flex-wrap gap-2 mt-5">
                {profile.moods.slice(0, 3).map(m => (
                  <span
                    key={m}
                    className="font-sans text-[11px] px-3 py-1 rounded-full capitalize"
                    style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                  >
                    {m}
                  </span>
                ))}
                <span
                  className="font-sans text-[11px] px-3 py-1 rounded-full capitalize"
                  style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                >
                  {profile.timeSlot === "latenight" ? "late night" : profile.timeSlot}
                </span>
                <span
                  className="font-sans text-[11px] px-3 py-1 rounded-full"
                  style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                >
                  {profile.price}
                </span>
              </div>
            )}
          </div>

          <div className="md:col-span-5 relative mt-8 md:mt-0">
            <div
              className="aspect-[4/5] rounded-xl overflow-hidden relative"
              style={{
                boxShadow: "0 1px 2px rgba(28,25,23,0.04), 0 8px 24px rgba(28,25,23,0.06)",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80"
                alt="Editorial hero"
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, transparent 50%, rgba(28,25,23,0.55) 100%)",
                }}
              />
              <div className="absolute bottom-5 left-5 right-5">
                <WhyPickedPill>Editor's choice tonight</WhyPickedPill>
                <div
                  className="font-serif italic text-white mt-3"
                  style={{ fontSize: 22, lineHeight: 1.2 }}
                >
                  "The cacio e pepe
                  <br />
                  quiets the room."
                </div>
                <div
                  className="font-sans text-[11px] uppercase tracking-[0.18em] mt-2"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  — Otello, Bella Vista
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Top picks */}
        <section className="pb-16">
          <SectionHeader
            eyebrow={hasPersonalization ? "Tuned to your answers" : "Tuned to your taste"}
            title="Top picks for you"
            aside={
              coldLoading
                ? "Finding your places…"
                : hasPersonalization
                ? "Personalized · just now"
                : "Updated 18 minutes ago"
            }
          />
          {coldLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl animate-pulse"
                  style={{ background: "#E7E5E4" }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {top.map(b => <PickCard key={b.id} biz={b} />)}
            </div>
          )}
        </section>

        {/* Because you liked — only rendered for warm users with real CF history */}
        {becauseLiked && becauseList.length > 0 && (
          <section className="pb-16">
            <SectionHeader
              eyebrow="Pattern matching"
              title={
                <>
                  Because you liked{" "}
                  <em style={{ fontStyle: "italic" }}>{becauseLiked.name}</em>
                </>
              }
              aside={`${becauseList.length} nearby in this lane`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {becauseList.map(b => <SmallCard key={b.id} biz={b} />)}
            </div>
          </section>
        )}

        {/* Trending */}
        <section className="pb-16">
          <SectionHeader
            eyebrow="What the city is into"
            title="Trending nearby"
            aside="By reservation velocity, last 14 days"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {trending.map((b, i) => <TrendingCard key={b.id} rank={i + 1} biz={b} />)}
          </div>
        </section>

        {/* Hidden gems */}
        {hiddenGems.length > 0 && (
          <section className="pb-16">
            <SectionHeader
              eyebrow="High rated, low profile"
              title="Hidden gems nearby"
              aside={`${hiddenGems.length} places · sorted by fewest reviews`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {hiddenGems.map((b, i) => (
                <TrendingCard key={b.id} rank={i + 1} biz={b} />
              ))}
            </div>
          </section>
        )}

        {/* Best value */}
        {bestValue.length > 0 && (
          <section className="pb-16">
            <SectionHeader
              eyebrow="Great quality, fair price"
              title="Best value picks"
              aside="$ and $$ · sorted by rating"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {bestValue.map(b => (
                <SmallCard key={b.id} biz={b} />
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="pb-8">
          <SectionHeader eyebrow="Browse by mood" title="A short shelf of categories" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {categories.map(c => (
              <button
                key={c.name}
                onClick={() => navigate("/search")}
                className="text-left group transition-all hover:-translate-y-[2px]"
              >
                <div className="aspect-square rounded-xl overflow-hidden relative">
                  <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(180deg, transparent 40%, rgba(28,25,23,0.55))",
                    }}
                  />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="font-serif text-white" style={{ fontSize: 17, lineHeight: 1.1 }}>
                      {c.name}
                    </div>
                    <div
                      className="font-sans text-[10px] mt-0.5 tabular-nums"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      {c.count} places
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
