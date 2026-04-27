import { NavLink, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Discovery" },
  { to: "/search", label: "Search" },
  { to: "/business/otello", label: "Detail" },
  { to: "/explain", label: "Why" },
  { to: "/profile", label: "You" },
];

export default function TopNav() {
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur"
      style={{ background: "rgba(250, 246, 240, 0.85)", borderBottom: "1px solid #E7E5E4" }}
    >
      <div
        className="mx-auto px-4 sm:px-8 py-4 flex items-center gap-4 sm:gap-8"
        style={{ maxWidth: 1280 }}
      >
        {/* Wordmark */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 shrink-0"
        >
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: "#1C1917" }}
          >
            <span
              className="font-serif text-[18px] leading-none"
              style={{ color: "#FAF6F0", fontStyle: "italic" }}
            >
              l
            </span>
          </div>
          <div className="leading-tight hidden sm:block">
            <div
              className="font-serif text-[18px] font-medium"
              style={{ color: "#1C1917", letterSpacing: "-0.01em" }}
            >
              Lantern
            </div>
            <div
              className="font-sans text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "#78716C" }}
            >
              Eat, well · Philadelphia
            </div>
          </div>
        </button>

        {/* Segmented nav */}
        <nav
          className="flex items-center gap-1 ml-auto overflow-x-auto"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E7E5E4",
            borderRadius: 999,
            padding: 3,
          }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `font-sans text-[13px] px-3 sm:px-4 py-1.5 rounded-full transition-colors duration-150 whitespace-nowrap ${
                  isActive
                    ? "font-medium"
                    : ""
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? "#1C1917" : "transparent",
                color: isActive ? "#FAF6F0" : "#1C1917",
                fontWeight: isActive ? 500 : 400,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Search icon + avatar */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate("/search")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1C1917"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full bg-cover bg-center shrink-0"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80)",
              border: "1px solid #E7E5E4",
            }}
          />
        </div>
      </div>
    </header>
  );
}
