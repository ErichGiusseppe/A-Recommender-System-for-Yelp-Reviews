import type { SignalKind } from "../types";
import CategoryDot from "./ui/CategoryDot";

interface SignalLineProps {
  kind: SignalKind;
  pct: number;
  label: string;
  sub: string;
}

export default function SignalLine({ kind, pct, label, sub }: SignalLineProps) {
  return (
    <div className="flex gap-3">
      <div className="pt-1.5">
        <CategoryDot kind={kind} />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[13px]" style={{ color: "#1C1917" }}>
            <span className="tabular-nums" style={{ fontWeight: 600 }}>
              {pct}%
            </span>
            <span className="mx-1.5" style={{ color: "#78716C" }}>
              —
            </span>
            {label}
          </span>
        </div>
        <div
          className="font-sans text-[10px] uppercase tracking-[0.14em] mt-0.5"
          style={{ color: "#78716C" }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}
