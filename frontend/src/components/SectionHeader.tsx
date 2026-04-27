import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow: string;
  title: ReactNode;
  aside?: string;
}

export default function SectionHeader({ eyebrow, title, aside }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
      <div>
        <div
          className="font-sans text-[11px] uppercase tracking-[0.22em] mb-2"
          style={{ color: "#C2410C" }}
        >
          {eyebrow}
        </div>
        <h2
          className="font-serif"
          style={{
            color: "#1C1917",
            fontSize: 36,
            lineHeight: 1.05,
            letterSpacing: "-0.015em",
            fontWeight: 400,
          }}
        >
          {title}
        </h2>
      </div>
      {aside && (
        <div className="font-sans text-[12px] pb-2" style={{ color: "#78716C" }}>
          {aside}
        </div>
      )}
    </div>
  );
}
