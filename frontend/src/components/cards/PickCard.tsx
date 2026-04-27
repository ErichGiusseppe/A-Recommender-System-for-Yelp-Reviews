import { useNavigate } from "react-router-dom";
import type { Business } from "../../types";
import MatchBadge from "../ui/MatchBadge";
import Rating from "../ui/Rating";

interface PickCardProps {
  biz: Business;
}

export default function PickCard({ biz }: PickCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/business/${biz.id}`)}
      className="text-left group transition-all duration-200 hover:-translate-y-[2px]"
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        boxShadow: "0 1px 2px rgba(28,25,23,0.04), 0 4px 12px rgba(28,25,23,0.04)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div className="aspect-[4/5] relative overflow-hidden">
        <img
          src={biz.image}
          alt={biz.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute top-3 left-3">
          <MatchBadge value={biz.match} />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className="font-serif truncate"
            style={{ color: "#1C1917", fontSize: 19, fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            {biz.name}
          </h3>
          <span className="font-sans text-[11px] tabular-nums shrink-0" style={{ color: "#78716C" }}>
            {biz.price}
          </span>
        </div>
        <div
          className="font-sans text-[11px] uppercase tracking-[0.14em] mt-1"
          style={{ color: "#78716C" }}
        >
          {biz.category} · {biz.neighborhood}
        </div>
        <div
          className="flex items-center justify-between mt-3 pt-3"
          style={{ borderTop: "1px solid #E7E5E4" }}
        >
          <Rating value={biz.rating} />
          <span className="font-sans text-[11px] tabular-nums" style={{ color: "#78716C" }}>
            {biz.reviews.toLocaleString()} reviews
          </span>
        </div>
      </div>
    </button>
  );
}
