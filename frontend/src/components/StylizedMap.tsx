import type { Business } from "../types";

const T = {
  ink: "#1C1917",
  muted: "#78716C",
  border: "#E7E5E4",
  terracotta: "#C2410C",
  teal: "#115E59",
  surface: "#FFFFFF",
  canvas: "#FAF6F0",
};

interface StylizedMapProps {
  businesses: Business[];
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
}

export default function StylizedMap({ businesses, hoverId, setHoverId }: StylizedMapProps) {
  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{ background: "#F4ECDF", border: `1px solid ${T.border}`, height: 720 }}
    >
      <svg viewBox="0 0 700 720" className="w-full h-full">
        <defs>
          <pattern id="paper" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#F4ECDF" />
            <circle cx="2" cy="2" r="0.4" fill="#E8DCC4" />
          </pattern>
        </defs>
        <rect width="700" height="720" fill="url(#paper)" />

        {/* River */}
        <path
          d="M -20 80 Q 200 140 380 90 T 720 60 L 720 130 Q 500 180 280 150 T -20 170 Z"
          fill="#D9CDB6"
          opacity="0.6"
        />
        {/* Park */}
        <path
          d="M 80 380 Q 140 360 200 380 Q 240 420 220 480 Q 180 520 120 500 Q 70 470 80 380 Z"
          fill="#C9D4B8"
          opacity="0.5"
        />

        {/* Horizontal streets */}
        {[120, 220, 320, 420, 520, 620].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="700" y2={y} stroke="#E8DCC4" strokeWidth="1.2" />
        ))}
        {/* Vertical streets */}
        {[80, 200, 320, 440, 560, 680].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="720" stroke="#E8DCC4" strokeWidth="1.2" />
        ))}
        {/* Diagonal arteries */}
        <line x1="0" y1="600" x2="700" y2="200" stroke="#E0D2B5" strokeWidth="2" />
        <line x1="40" y1="0" x2="600" y2="720" stroke="#E0D2B5" strokeWidth="1.5" />

        {/* Neighborhood labels */}
        <text x="40" y="110" fontFamily="Inter, sans-serif" fontSize="9" fill="#A8997D" letterSpacing="2">SCHUYLKILL</text>
        <text x="120" y="450" fontFamily="Inter, sans-serif" fontSize="9" fill="#A8997D" letterSpacing="2">RITTENHOUSE</text>
        <text x="380" y="320" fontFamily="Inter, sans-serif" fontSize="9" fill="#A8997D" letterSpacing="2">CENTER CITY</text>
        <text x="500" y="190" fontFamily="Inter, sans-serif" fontSize="9" fill="#A8997D" letterSpacing="2">FISHTOWN</text>

        {/* Business pins */}
        {businesses.map((b) => {
          const isHover = hoverId === b.id;
          const color = b.match >= 88 ? T.terracotta : T.teal;
          return (
            <g
              key={b.id}
              transform={`translate(${b.coords.x},${b.coords.y})`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverId(b.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {isHover && <circle r="22" fill={color} opacity="0.18" />}
              <circle r={isHover ? 14 : 11} fill={color} stroke="white" strokeWidth="2.5" />
              <text
                textAnchor="middle"
                y="4"
                fontFamily="Inter, sans-serif"
                fontSize="10"
                fontWeight="600"
                fill="white"
              >
                {b.match}
              </text>
              {isHover && (
                <g transform="translate(18,-10)">
                  <rect width="160" height="44" rx="6" fill="white" stroke={T.border} />
                  <text
                    x="10"
                    y="18"
                    fontFamily="Fraunces, serif"
                    fontSize="13"
                    fill={T.ink}
                    fontWeight="500"
                  >
                    {b.name}
                  </text>
                  <text x="10" y="34" fontFamily="Inter, sans-serif" fontSize="10" fill={T.muted}>
                    {b.category} · {b.price}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Compass */}
        <g transform="translate(640,660)" opacity="0.5">
          <circle r="20" fill="white" stroke={T.border} />
          <text textAnchor="middle" y="-8" fontFamily="Inter, sans-serif" fontSize="8" fill={T.muted}>N</text>
          <path d="M 0 -5 L -3 5 L 0 2 L 3 5 Z" fill={T.terracotta} />
        </g>
      </svg>

      {/* Controls overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div
          className="px-3 py-1.5 rounded-full font-sans text-[11px]"
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            color: T.ink,
          }}
        >
          <span className="tabular-nums font-medium">{businesses.length}</span> on this map
        </div>
        <div className="flex gap-1.5">
          <button
            className="w-8 h-8 rounded-full font-sans text-[14px]"
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
          >
            +
          </button>
          <button
            className="w-8 h-8 rounded-full font-sans text-[14px]"
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
          >
            −
          </button>
        </div>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 px-3 py-2 rounded-md font-sans text-[10px] uppercase tracking-[0.16em] flex items-center gap-3"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: T.terracotta }} />
          High match
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: T.teal }} />
          Worth a look
        </span>
      </div>
    </div>
  );
}
