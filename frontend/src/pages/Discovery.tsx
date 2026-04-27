import { useNavigate } from "react-router-dom";
import { BUSINESSES, CATEGORIES } from "../data/mock";
import SectionHeader from "../components/SectionHeader";
import PickCard from "../components/cards/PickCard";
import SmallCard from "../components/cards/SmallCard";
import TrendingCard from "../components/cards/TrendingCard";
import WhyPickedPill from "../components/ui/WhyPickedPill";

export default function Discovery() {
  const navigate = useNavigate();

  const top = BUSINESSES.slice(0, 4);
  const trending = [BUSINESSES[2], BUSINESSES[5], BUSINESSES[13]];
  const becauseLiked = BUSINESSES[0]; // Otello
  const becauseList = [BUSINESSES[7], BUSINESSES[10], BUSINESSES[1]];

  return (
    <div className="mx-auto px-4 sm:px-8 pt-10" style={{ maxWidth: 1280 }}>
      {/* Hero */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-16">
        <div className="md:col-span-7 flex flex-col justify-end">
          <div
            className="font-sans text-[11px] uppercase tracking-[0.22em] mb-5"
            style={{ color: "#78716C" }}
          >
            ☾ &nbsp;Wednesday · 47°F · clear
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
            Tonight in
            <br />
            <span style={{ fontStyle: "italic", color: "#C2410C" }}>Philadelphia</span>
            <span style={{ color: "#1C1917" }}>.</span>
          </h1>
          <p
            className="font-serif italic mt-7 max-w-[520px]"
            style={{ color: "#78716C", fontSize: 19, lineHeight: 1.55 }}
          >
            Six rooms worth leaving the house for, picked from your taste graph and tonight's
            weather. The night is cold; the recommendations skew warm.
          </p>
          <div className="flex items-center gap-3 mt-8 flex-wrap">
            <button
              onClick={() => navigate("/search")}
              className="font-sans text-[13px] font-medium px-5 py-2.5 rounded-full transition-all hover:-translate-y-[2px]"
              style={{ background: "#1C1917", color: "#FAF6F0" }}
            >
              Browse all 142 picks
            </button>
            <button
              onClick={() => navigate("/explain")}
              className="font-sans text-[13px] px-5 py-2.5 rounded-full transition-all hover:-translate-y-[2px]"
              style={{ color: "#1C1917", border: "1px solid #E7E5E4", background: "#FFFFFF" }}
            >
              How we recommend →
            </button>
          </div>
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
          eyebrow="Tuned to your taste"
          title="Top picks for you"
          aside="Updated 18 minutes ago"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {top.map((b) => (
            <PickCard key={b.id} biz={b} />
          ))}
        </div>
      </section>

      {/* Because you liked */}
      <section className="pb-16">
        <SectionHeader
          eyebrow="Pattern matching"
          title={
            <>
              Because you liked{" "}
              <em style={{ fontStyle: "italic" }}>{becauseLiked.name}</em>
            </>
          }
          aside="3 nearby in this lane"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {becauseList.map((b) => (
            <SmallCard key={b.id} biz={b} />
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="pb-16">
        <SectionHeader
          eyebrow="What the city is into"
          title="Trending nearby"
          aside="By reservation velocity, last 14 days"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {trending.map((b, i) => (
            <TrendingCard key={b.id} rank={i + 1} biz={b} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="pb-8">
        <SectionHeader eyebrow="Browse by mood" title="A short shelf of categories" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              onClick={() => navigate("/search")}
              className="text-left group transition-all hover:-translate-y-[2px]"
            >
              <div className="aspect-square rounded-xl overflow-hidden relative">
                <img
                  src={c.img}
                  alt={c.name}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 40%, rgba(28,25,23,0.55))",
                  }}
                />
                <div className="absolute bottom-3 left-3 right-3">
                  <div
                    className="font-serif text-white"
                    style={{ fontSize: 17, lineHeight: 1.1 }}
                  >
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
  );
}
