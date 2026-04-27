import type { ReactNode } from "react";

interface WhyPickedPillProps {
  children: ReactNode;
}

export default function WhyPickedPill({ children }: WhyPickedPillProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-[11px] font-medium"
      style={{ background: "#FEF3E7", color: "#C2410C", border: "1px solid #FED7AA" }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 22 12 17.27 5.82 22l2.36-8.15L2 9.36h7.61z" />
      </svg>
      {children}
    </span>
  );
}
