interface StatProps {
  n: string | number;
  label: string;
}

export default function Stat({ n, label }: StatProps) {
  return (
    <div>
      <div
        className="font-serif tabular-nums"
        style={{ color: "#1C1917", fontSize: 36, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}
      >
        {n}
      </div>
      <div
        className="font-sans text-[11px] uppercase tracking-[0.16em] mt-2"
        style={{ color: "#78716C" }}
      >
        {label}
      </div>
    </div>
  );
}
