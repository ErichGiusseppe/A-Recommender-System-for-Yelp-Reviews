import { useNavigate } from "react-router-dom";
import type { Business } from "../../types";
import MatchBadge from "../ui/MatchBadge";
import Rating from "../ui/Rating";
import ReasonPill from "../ui/ReasonPill";

interface SearchCardProps {
  biz: Business;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export default function SearchCard({ biz, hovered, onHover, onLeave }: SearchCardProps) {
  const navigate = useNavigate();
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={() => navigate(`/business/${biz.id}`)}
      className="cursor-pointer flex gap-5 p-4 rounded-xl transition-all duration-200"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${hovered ? "#1C1917" : "#E7E5E4"}`,
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered
          ? "0 4px 16px rgba(28,25,23,0.08)"
          : "0 1px 2px rgba(28,25,23,0.03)",
      }}
    >
      <div className="relative shrink-0">
        <img
          src={biz.image}
          alt={biz.name}
          className="w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] object-cover rounded-lg"
        />
        <div className="absolute top-2.5 left-2.5">
          <MatchBadge value={biz.match} />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            className="font-serif"
            style={{ color: "#1C1917", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            {biz.name}
          </h3>
          <span
            className="font-sans text-[12px] tabular-nums shrink-0"
            style={{ color: "#78716C" }}
          >
            {biz.price}
          </span>
        </div>
        <div
          className="font-sans text-[11px] uppercase tracking-[0.14em] mt-1"
          style={{ color: "#78716C" }}
        >
          {biz.category} · {biz.neighborhood} · {biz.city}
        </div>
        <div className="flex items-center gap-3 mt-2.5">
          <Rating value={biz.rating} />
          <span className="font-sans text-[11px] tabular-nums" style={{ color: "#78716C" }}>
            {biz.reviews.toLocaleString()} reviews
          </span>
        </div>
        {(biz.excerpt || biz.whyPicked) && (
          <p
            className="font-serif italic mt-3"
            style={{ color: "#1C1917", fontSize: 15, lineHeight: 1.5 }}
          >
            "{biz.excerpt || biz.whyPicked}"
          </p>
        )}
        <div className="flex items-center gap-2 mt-auto pt-3 flex-wrap">
          <ReasonPill cf={biz.cf} ctx={biz.ctx} pop={biz.pop} solid />
          {biz.attributes.slice(0, 2).map((a) => (
            <span
              key={a}
              className="font-sans text-[11px] px-2 py-0.5 rounded-full"
              style={{ color: "#78716C", background: "#FAF6F0" }}
            >
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
