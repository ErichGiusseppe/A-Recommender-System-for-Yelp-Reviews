import { useState, useEffect, useMemo } from "react";
import { useBusinesses, useCategories } from "../hooks/useApi";
import { useNeighborhood } from "../contexts/NeighborhoodContext";
import { api } from "../lib/api";
import Chip from "../components/ui/Chip";
import SearchCard from "../components/cards/SearchCard";
import PhillyMap from "../components/PhillyMap";
import type { Business } from "../types";

const PRICES = ["$", "$$", "$$$"];

function getTimeBucket(hour: number): { label: string; icon: string } {
  if (hour >= 6  && hour < 11) return { label: "Morning",    icon: "☀" };
  if (hour >= 11 && hour < 15) return { label: "Lunch",      icon: "◑" };
  if (hour >= 15 && hour < 18) return { label: "Afternoon",  icon: "☕" };
  if (hour >= 18 && hour < 23) return { label: "Dinner",     icon: "☾" };
  return                               { label: "Late night", icon: "★" };
}

export default function Search() {
  const [query, setQuery]         = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [prices, setPrices]         = useState<string[]>([]);
  const [results, setResults]   = useState<Business[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [hoverId, setHoverId]   = useState<string | null>(null);

  const { data: businesses }           = useBusinesses();
  const { data: categoryList }         = useCategories();
  const { city, coords, neighborhood } = useNeighborhood();

  const timeBucket = useMemo(() => getTimeBucket(new Date().getHours()), []);

  useEffect(() => {
    const hasFilter = query.trim() || categories.length > 0 || prices.length > 0;
    if (!hasFilter) {
      setResults(null);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .search({
          q:          query.trim() || undefined,
          categories: categories.length > 0 ? categories : undefined,
          prices:     prices.length > 0     ? prices     : undefined,
          limit:      100,
        })
        .then((r) => {
          const currentCity = city || "Philadelphia";
          const filtered = r.items.filter((b) => b.city === currentCity);
          setResults(filtered);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, categories, prices, city]);

  const list = results ?? businesses;
  const hasActiveFilter = query || categories.length > 0 || prices.length > 0;

  const toggleCategory = (cat: string) =>
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const togglePrice = (p: string) =>
    setPrices((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  return (
    <div className="mx-auto px-4 sm:px-8 pt-8" style={{ maxWidth: 1280 }}>
      <div className="pb-6">

        {/* Eyebrow row */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="font-sans text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "#C2410C" }}
          >
            Searching · {neighborhood ? `${neighborhood}, ${city}` : city || "Philadelphia"}
          </div>
          <div
            className="font-sans text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
          >
            {timeBucket.icon}&nbsp;&nbsp;{timeBucket.label} mode active
          </div>
        </div>

        {/* Search input */}
        <div className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Italian, cozy, late night, sushi..."
            className="w-full font-serif rounded-xl px-5 py-4 outline-none transition-all"
            style={{
              fontSize: "clamp(17px, 2.2vw, 24px)",
              color: "#1C1917",
              background: "#FFFFFF",
              border: "1.5px solid #E7E5E4",
              boxShadow: "0 1px 6px rgba(28,25,23,0.05)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "#C2410C")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "#E7E5E4")
            }
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-[13px] w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
              style={{ color: "#78716C", background: "#F5F5F4" }}
            >
              ✕
            </button>
          ) : (
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "#C4BAB4" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          )}
        </div>

        {/* Category chips — from real data */}
        <div className="flex flex-wrap gap-2 mb-2">
          {categoryList.map((c) => (
            <Chip key={c.name} active={categories.includes(c.name)} onClick={() => toggleCategory(c.name)}>
              {c.name}
            </Chip>
          ))}
        </div>

        {/* Price + meta row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {PRICES.map((p) => (
            <Chip key={p} active={prices.includes(p)} onClick={() => togglePrice(p)}>
              {p}
            </Chip>
          ))}

          {hasActiveFilter && (
            <button
              onClick={() => { setQuery(""); setCategories([]); setPrices([]); }}
              className="font-sans text-[12px] px-3 py-1.5 rounded-full transition-all"
              style={{ color: "#C2410C", border: "1px solid #FECACA", background: "#FFF7F5" }}
            >
              Clear all
            </button>
          )}

          <div className="ml-auto font-sans text-[12px]" style={{ color: "#78716C" }}>
            {searching ? (
              <span style={{ color: "#C2410C" }}>Searching...</span>
            ) : (
              <>
                <span className="tabular-nums" style={{ color: "#1C1917", fontWeight: 500 }}>
                  {list.length}
                </span>{" "}
                places · ranked by your taste
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results + map */}
      <div className="flex flex-col lg:grid lg:gap-8" style={{ gridTemplateColumns: "1fr 0.7fr" }}>
        <div className="space-y-4 mb-8 lg:mb-0">
          {list.map((b) => (
            <SearchCard
              key={b.id}
              biz={b}
              hovered={hoverId === b.id}
              onHover={() => setHoverId(b.id)}
              onLeave={() => setHoverId(null)}
            />
          ))}
          {list.length === 0 && !searching && (
            <div
              className="font-serif italic text-center py-20"
              style={{ color: "#78716C", fontSize: 19 }}
            >
              No places found — try different filters.
            </div>
          )}
        </div>

        <div className="relative hidden lg:block">
          <div className="sticky top-24">
            <PhillyMap
              businesses={list}
              center={coords}
              neighborhoodName={neighborhood || "Philadelphia"}
              hoverId={hoverId}
              setHoverId={setHoverId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
