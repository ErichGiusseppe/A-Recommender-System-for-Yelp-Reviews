import Star from "./Star";

interface RatingProps {
  value: number;
  size?: number;
}

export default function Rating({ value, size = 12 }: RatingProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Star size={size} />
      <span className="font-sans text-[13px] tabular-nums font-medium text-ink">
        {value.toFixed(1)}
      </span>
    </span>
  );
}
