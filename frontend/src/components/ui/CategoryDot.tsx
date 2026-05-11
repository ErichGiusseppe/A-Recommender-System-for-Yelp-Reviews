import type { SignalKind } from "../../types";

const COLORS: Record<SignalKind, string> = {
  cf:  "#C2410C",
  cb:  "#6366F1",
  ctx: "#115E59",
  pop: "#EAB308",
};

interface CategoryDotProps {
  kind: SignalKind;
}

export default function CategoryDot({ kind }: CategoryDotProps) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: COLORS[kind] }}
    />
  );
}
