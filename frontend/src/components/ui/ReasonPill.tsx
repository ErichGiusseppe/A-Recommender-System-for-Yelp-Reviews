import type { SignalKind } from "../../types";

interface ReasonPillProps {
  cf: number;
  cb?: number;
  ctx: number;
  pop: number;
  solid?: boolean;
}

function dominant(cf: number, cb: number, ctx: number, pop: number): SignalKind | null {
  if (cf === 0 && cb === 0 && ctx === 0 && pop === 0) return null;
  if (cf >= cb && cf >= ctx && cf >= pop) return "cf";
  if (cb >= ctx && cb >= pop) return "cb";
  if (ctx >= pop) return "ctx";
  return "pop";
}

const LABELS: Record<SignalKind, string> = {
  cf:  "Picked for you",
  cb:  "Content match",
  ctx: "Fits your plans",
  pop: "Trending nearby",
};

const OVERLAY_COLORS: Record<SignalKind, { bg: string; text: string }> = {
  cf:  { bg: "rgba(194,65,12,0.82)",  text: "#FFFFFF" },
  cb:  { bg: "rgba(99,102,241,0.82)", text: "#FFFFFF" },
  ctx: { bg: "rgba(17,94,89,0.82)",   text: "#FFFFFF" },
  pop: { bg: "rgba(120,70,10,0.82)",  text: "#FFFFFF" },
};

const SOLID_COLORS: Record<SignalKind, { bg: string; text: string; border: string }> = {
  cf:  { bg: "#FEF0EC", text: "#C2410C", border: "#FECACA" },
  cb:  { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  ctx: { bg: "#F0FDFA", text: "#115E59", border: "#99F6E4" },
  pop: { bg: "#FEFCE8", text: "#854D0E", border: "#FDE68A" },
};

export default function ReasonPill({ cf, cb = 0, ctx, pop, solid = false }: ReasonPillProps) {
  const kind = dominant(cf, cb, ctx, pop);
  if (!kind) return null;

  if (solid) {
    const { bg, text, border } = SOLID_COLORS[kind];
    return (
      <span
        className="font-sans text-[11px] px-3 py-1 rounded-full"
        style={{ background: bg, color: text, border: `1px solid ${border}` }}
      >
        ★ {LABELS[kind]}
      </span>
    );
  }

  const { bg, text } = OVERLAY_COLORS[kind];
  return (
    <span
      className="font-sans text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full"
      style={{ background: bg, color: text, backdropFilter: "blur(6px)" }}
    >
      {LABELS[kind]}
    </span>
  );
}
