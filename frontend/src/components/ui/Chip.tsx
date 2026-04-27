import type { ReactNode } from "react";

interface ChipProps {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}

export default function Chip({ active = false, children, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className="font-sans text-[13px] px-3.5 py-2 rounded-full transition-all duration-150"
      style={{
        background: active ? "#1C1917" : "#FFFFFF",
        color: active ? "#FAF6F0" : "#1C1917",
        border: `1px solid ${active ? "#1C1917" : "#E7E5E4"}`,
      }}
    >
      {children}
    </button>
  );
}
