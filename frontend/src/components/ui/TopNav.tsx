import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNeighborhood } from "../../contexts/NeighborhoodContext";

const NAV_ITEMS = [
  { to: "/",        label: "Discovery" },
  { to: "/search",  label: "Search" },
  { to: "/explain", label: "Why" },
  { to: "/profile", label: "You" },
];

const DEMO_ACCOUNTS = [
  { username: "camila", label: "Camila Restrepo" },
  { username: "daniel", label: "Daniel Park" },
  { username: "sara",   label: "Sara Gómez" },
];

export default function TopNav() {
  const navigate = useNavigate();
  const { user, isGuest, login, logout } = useAuth();
  const { city, neighborhood, openPicker } = useNeighborhood();
  const [open, setOpen] = useState(false);

  async function switchTo(alias: string) {
    setOpen(false);
    try { await login(alias, alias); } catch { /* ignore */ }
  }

  const initials = user
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur"
      style={{ background: "rgba(250, 246, 240, 0.85)", borderBottom: "1px solid #E7E5E4" }}
    >
      <div
        className="mx-auto px-4 sm:px-8 py-4 flex items-center gap-4 sm:gap-6"
        style={{ maxWidth: 1280 }}
      >
        {/* Wordmark */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: "#1C1917" }}
          >
            <span className="font-serif text-[18px] leading-none" style={{ color: "#FAF6F0", fontStyle: "italic" }}>
              l
            </span>
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-serif text-[18px] font-medium" style={{ color: "#1C1917", letterSpacing: "-0.01em" }}>
              Lantern
            </div>
            <div className="font-sans text-[10px] uppercase tracking-[0.14em]" style={{ color: "#78716C" }}>
              Eat, well · {city || "Philadelphia"}
            </div>
          </div>
        </button>

        {/* Nav pills */}
        <nav
          className="flex items-center gap-1 overflow-x-auto"
          style={{ background: "#FFFFFF", border: "1px solid #E7E5E4", borderRadius: 999, padding: 3 }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `font-sans text-[13px] px-3 sm:px-4 py-1.5 rounded-full transition-colors duration-150 whitespace-nowrap ${isActive ? "font-medium" : ""}`
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

        {/* Neighborhood pill */}
        <button
          onClick={openPicker}
          className="hidden sm:flex items-center gap-1.5 font-sans text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-70 shrink-0"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E7E5E4",
            color: "#78716C",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span style={{ color: city ? "#C2410C" : "#78716C", fontWeight: city ? 500 : 400 }}>
            {neighborhood ? `${neighborhood}, ${city}` : city || "Set location"}
          </span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {/* Search icon */}
          <button
            onClick={() => navigate("/search")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>

          {/* Auth area */}
          {isGuest ? (
            <button
              onClick={() => navigate("/login")}
              className="font-sans text-[13px] font-medium px-4 py-1.5 rounded-full transition-colors"
              style={{ background: "#1C1917", color: "#FAF6F0" }}
            >
              Sign in
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setOpen(o => !o)}
                className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-[13px] font-semibold shrink-0"
                style={{ background: "#1C1917", color: "#FAF6F0", border: "1px solid #1C1917" }}
                title={user?.name}
              >
                {initials}
              </button>

              {open && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                  <div
                    className="absolute right-0 top-11 z-50 rounded-xl overflow-hidden"
                    style={{ background: "#FFFFFF", border: "1px solid #E7E5E4", minWidth: 200, boxShadow: "0 4px 24px rgba(28,25,23,0.12)" }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid #E7E5E4" }}>
                      <div className="font-sans text-[13px] font-medium" style={{ color: "#1C1917" }}>
                        {user?.name}
                      </div>
                      <div className="font-sans text-[11px]" style={{ color: "#A8A29E" }}>
                        {user?.user_id}
                      </div>
                    </div>

                    <div className="py-1" style={{ borderBottom: "1px solid #E7E5E4" }}>
                      <div
                        className="px-4 py-1.5 font-sans text-[11px] uppercase tracking-[0.1em]"
                        style={{ color: "#A8A29E" }}
                      >
                        Switch account
                      </div>
                      {DEMO_ACCOUNTS.filter(a => a.label !== user?.name).map(({ username, label }) => (
                        <button
                          key={username}
                          onClick={() => switchTo(username)}
                          className="w-full text-left px-4 py-2 font-sans text-[13px] transition-colors hover:bg-stone-50"
                          style={{ color: "#1C1917" }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => { setOpen(false); logout(); navigate("/"); }}
                      className="w-full text-left px-4 py-3 font-sans text-[13px] transition-colors hover:bg-stone-50"
                      style={{ color: "#78716C" }}
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
