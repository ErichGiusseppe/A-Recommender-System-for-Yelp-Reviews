import { useNavigate } from "react-router-dom";
import type { Business } from "../../types";
import Rating from "../ui/Rating";

interface TrendingCardProps {
  rank: number;
  biz: Business;
}

export default function TrendingCard({ rank, biz }: TrendingCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/business/${biz.id}`)}
      className="text-left flex gap-5 group transition-all hover:-translate-y-[2px] w-full"
    >
      <div
        className="font-serif italic shrink-0"
        style={{ fontSize: 56, color: "#C2410C", lineHeight: 0.9, fontWeight: 400 }}
      >
        {rank}
      </div>
      <div className="flex-1">
        <img
          src={biz.image}
          alt={biz.name}
          className="w-full aspect-[5/3] object-cover rounded-lg mb-3"
        />
        <h3
          className="font-serif"
          style={{ color: "#1C1917", fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}
        >
          {biz.name}
        </h3>
        <div
          className="font-sans text-[11px] uppercase tracking-[0.14em] mt-1"
          style={{ color: "#78716C" }}
        >
          {biz.category} · {biz.neighborhood}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Rating value={biz.rating} />
          <span className="font-sans text-[11px] tabular-nums" style={{ color: "#78716C" }}>
            {biz.reviews.toLocaleString()} reviews
          </span>
        </div>
      </div>
    </button>
  );
}
