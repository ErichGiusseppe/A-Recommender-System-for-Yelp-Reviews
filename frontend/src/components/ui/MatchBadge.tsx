interface MatchBadgeProps {
  value: number;
  size?: "sm" | "md" | "lg";
}

export default function MatchBadge({ value, size = "md" }: MatchBadgeProps) {
  const big = size === "lg";
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full ${big ? "px-3 py-1.5" : "px-2.5 py-1"}`}
      style={{ background: "#C2410C", color: "white" }}
    >
      <span className={`tabular-nums font-sans font-semibold ${big ? "text-sm" : "text-[11px]"}`}>
        {value}%
      </span>
      <span
        className={`font-sans uppercase tracking-wider ${big ? "text-[11px]" : "text-[10px]"} opacity-90`}
      >
        match
      </span>
    </div>
  );
}
