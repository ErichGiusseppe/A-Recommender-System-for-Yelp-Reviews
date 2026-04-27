import type { SignalKind } from "../types";
import CategoryDot from "./ui/CategoryDot";

interface SignalControlProps {
  kind: SignalKind;
  label: string;
  sub: string;
  value: number;
  onChange: (v: number) => void;
  example: string;
}

export default function SignalControl({
  kind,
  label,
  sub,
  value,
  onChange,
  example,
}: SignalControlProps) {
  return (
    <div className="mb-5 pb-5" style={{ borderBottom: "1px solid #E7E5E4" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <CategoryDot kind={kind} />
        <span className="font-sans text-[14px]" style={{ color: "#1C1917", fontWeight: 500 }}>
          {label}
        </span>
        <span
          className="ml-auto font-sans text-[14px] tabular-nums"
          style={{ color: "#1C1917", fontWeight: 600 }}
        >
          {value}%
        </span>
      </div>
      <div className="font-sans text-[11px] mb-2.5" style={{ color: "#78716C" }}>
        {sub}
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="lantern-slider"
        data-kind={kind}
      />
      <div className="font-serif italic text-[12px] mt-2" style={{ color: "#78716C" }}>
        e.g. {example}
      </div>
    </div>
  );
}
