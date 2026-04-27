const AMBER = "#EAB308";

interface StarProps {
  size?: number;
  filled?: boolean;
}

export default function Star({ size = 12, filled = true }: StarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? AMBER : "none"}
      stroke={AMBER}
      strokeWidth="1.5"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
