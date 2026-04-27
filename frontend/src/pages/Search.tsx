import { useState } from "react";
import { BUSINESSES } from "../data/mock";
import Chip from "../components/ui/Chip";
import SearchCard from "../components/cards/SearchCard";
import StylizedMap from "../components/StylizedMap";

const FILTERS = [
  "All",
  "Italian",
  "Specialty Coffee",
  "Cocktail Bars",
  "Mediterranean",
  "Open late",
  "Outdoor seating",
  "$$",
];

export default function Search() {
  const [filter, setFilter] = useState("All");
  const [hoverId, setHoverId] = useState<string | null>(null);

  const list = BUSINESSES.filter((b) => {
    if (filter === "All") return true;
    if (filter === "Open late") return b.attributes.includes("Open late");
    if (filter === "Outdoor seating") return b.attributes.includes("Outdoor seating");
    if (filter === "$$") return b.price === "$$";
    return b.category === filter;
  }).slice(0, 9);

  return (
    <div className="mx-auto px-4 sm:px-8 pt-8" style={{ maxWidth: 1280 }}>
      {/* Search header */}
      <div className="pb-6">
        <div
          className="font-sans text-[11px] uppercase tracking-[0.22em] mb-2"
          style={{ color: "#C2410C" }}
        >
          Searching · Philadelphia
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <h1
            className="font-serif"
            style={{
              color: "#1C1917",
              fontSize: "clamp(28px, 4vw, 44px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            "<em style={{ fontStyle: "italic" }}>cozy dinner, walking distance</em>"
          </h1>
          <div className="font-sans text-[12px] sm:pb-2" style={{ color: "#78716C" }}>
            <span className="tabular-nums" style={{ color: "#1C1917", fontWeight: 500 }}>
              {list.length}
            </span>{" "}
            places · ranked by your taste
          </div>
        </div>

        <div className="flex items-center gap-2 mt-7 flex-wrap">
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
          <div
            className="ml-auto font-sans text-[12px] flex items-center gap-2"
            style={{ color: "#78716C" }}
          >
            <span>Sort:</span>
            <span style={{ color: "#1C1917", fontWeight: 500 }}>Best match for you ↓</span>
          </div>
        </div>
      </div>

      {/* 60/40 split — stacks on mobile */}
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
        </div>

        <div className="relative hidden lg:block">
          <div className="sticky top-24">
            <StylizedMap businesses={list} hoverId={hoverId} setHoverId={setHoverId} />
          </div>
        </div>
      </div>
    </div>
  );
}
