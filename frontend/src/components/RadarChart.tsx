import type { TasteProfile } from "../types";

const AXES = [
  { k: "italian" as const, label: "Italian" },
  { k: "asian" as const, label: "Asian" },
  { k: "cozy" as const, label: "Cozy" },
  { k: "lively" as const, label: "Lively" },
  { k: "cheap" as const, label: "Cheap" },
  { k: "special" as const, label: "Special" },
];

interface RadarChartProps {
  taste: TasteProfile;
}

export default function RadarChart({ taste }: RadarChartProps) {
  const cx = 160, cy = 160, R = 120;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;
  const point = (i: number, v: number): [number, number] => {
    const r = (v / 100) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };

  const polyPoints = AXES.map((a, i) => point(i, taste[a.k]).join(",")).join(" ");

  return (
    <svg viewBox="0 0 320 320" className="w-full">
      {/* Rings */}
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon
          key={s}
          points={AXES.map((_, i) => {
            const r = R * s;
            return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))].join(",");
          }).join(" ")}
          fill="none"
          stroke="#E7E5E4"
          strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {AXES.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E7E5E4" strokeWidth="1" />;
      })}
      {/* Filled shape */}
      <polygon
        points={polyPoints}
        fill="#C2410C"
        fillOpacity="0.18"
        stroke="#115E59"
        strokeWidth="2"
      />
      {/* Vertices */}
      {AXES.map((a, i) => {
        const [x, y] = point(i, taste[a.k]);
        return <circle key={a.k} cx={x} cy={y} r="3.5" fill="#115E59" />;
      })}
      {/* Labels */}
      {AXES.map((a, i) => {
        const [x, y] = point(i, 122);
        return (
          <text
            key={a.k}
            x={x}
            y={y}
            textAnchor={x < cx - 5 ? "end" : x > cx + 5 ? "start" : "middle"}
            dy={y < cy ? -4 : 12}
            fontFamily="Inter, sans-serif"
            fontSize="11"
            fill="#1C1917"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
