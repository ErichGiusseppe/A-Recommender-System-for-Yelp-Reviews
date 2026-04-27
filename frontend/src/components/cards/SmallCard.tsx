import { useNavigate } from "react-router-dom";
import type { Business } from "../../types";
import MatchBadge from "../ui/MatchBadge";
import Rating from "../ui/Rating";

interface SmallCardProps {
  biz: Business;
}

export default function SmallCard({ biz }: SmallCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/business/${biz.id}`)}
      className="text-left flex gap-4 p-3 rounded-xl transition-all hover:-translate-y-[2px] w-full"
      style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
    >
      <img
        src={biz.image}
        alt={biz.name}
        className="w-24 h-24 object-cover rounded-lg shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className="font-serif truncate"
            style={{ color: "#1C1917", fontSize: 17, fontWeight: 500 }}
          >
            {biz.name}
          </h3>
          <MatchBadge value={biz.match} />
        </div>
        <div
          className="font-sans text-[11px] uppercase tracking-[0.14em] mt-1"
          style={{ color: "#78716C" }}
        >
          {biz.category} · {biz.city}
        </div>
        <p
          className="font-serif italic text-[13px] mt-2"
          style={{ color: "#1C1917", lineHeight: 1.45 }}
        >
          "{biz.excerpt}"
        </p>
        <div className="flex items-center gap-3 mt-2.5">
          <Rating value={biz.rating} />
          <span className="font-sans text-[11px] tabular-nums" style={{ color: "#78716C" }}>
            · {biz.reviews}
          </span>
        </div>
      </div>
    </button>
  );
}
