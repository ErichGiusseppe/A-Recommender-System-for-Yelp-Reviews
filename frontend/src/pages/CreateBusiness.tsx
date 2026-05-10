import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

const PRICES = ["$", "$$", "$$$", "$$$$"] as const;

const inputStyle = {
  background: "#FFFFFF",
  border: "1px solid #E7E5E4",
  color: "#1C1917",
  width: "100%",
};

export default function CreateBusiness() {
  const { isGuest } = useAuth();
  const navigate    = useNavigate();

  const [categories, setCategories] = useState<string[]>([]);
  const [cities,     setCities]     = useState<string[]>([]);

  const [name,         setName]         = useState("");
  const [category,     setCategory]     = useState("");
  const [city,         setCity]         = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address,      setAddress]      = useState("");
  const [price,        setPrice]        = useState<"$"|"$$"|"$$$"|"$$$$">("$$");
  const [rating,       setRating]       = useState("0");
  const [error,        setError]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    api.categories().then(cats => {
      const names = cats.map(c => c.name);
      setCategories(names);
      setCategory(names[0] ?? "");
    }).catch(() => {});

    api.cities().then(cs => {
      setCities(cs);
      setCity(cs[0] ?? "");
    }).catch(() => {});
  }, []);

  if (isGuest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: "#FAF6F0" }}>
        <p className="font-serif text-[22px]" style={{ color: "#1C1917" }}>
          You need to be signed in to add a place.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="font-sans text-[14px] font-medium px-6 py-2 rounded-lg"
          style={{ background: "#1C1917", color: "#FAF6F0" }}
        >
          Sign in
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const biz = await api.createBusiness({
        name,
        category,
        city,
        neighborhood: neighborhood.trim() || city,
        address,
        price,
        rating: parseFloat(rating) || 0,
      });
      navigate(`/business/${biz.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("401") ? "Session expired. Please sign in again." : "Could not create place. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto px-4 py-10" style={{ maxWidth: 560 }}>
      <button
        onClick={() => navigate(-1)}
        className="font-sans text-[13px] mb-8 flex items-center gap-1"
        style={{ color: "#78716C" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1
        className="font-serif text-[32px] leading-tight mb-1"
        style={{ color: "#1C1917", letterSpacing: "-0.025em" }}
      >
        Add a place
      </h1>
      <p className="font-sans text-[14px] mb-8" style={{ color: "#78716C" }}>
        New places appear in search and discovery right away.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[12px] uppercase tracking-[0.1em]" style={{ color: "#78716C" }}>
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="e.g. La Paloma"
            className="font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
            style={inputStyle}
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[12px] uppercase tracking-[0.1em]" style={{ color: "#78716C" }}>
            Category *
          </label>
          {categories.length === 0 ? (
            <div className="h-12 rounded-lg animate-pulse" style={{ background: "#E7E5E4" }} />
          ) : (
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
              style={{ ...inputStyle, appearance: "auto" }}
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* City + Neighborhood */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[12px] uppercase tracking-[0.1em]" style={{ color: "#78716C" }}>
              City *
            </label>
            {cities.length === 0 ? (
              <div className="h-12 rounded-lg animate-pulse" style={{ background: "#E7E5E4" }} />
            ) : (
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
                style={{ ...inputStyle, appearance: "auto" }}
              >
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[12px] uppercase tracking-[0.1em]" style={{ color: "#78716C" }}>
              Neighborhood
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={e => setNeighborhood(e.target.value)}
              placeholder="e.g. Center City"
              className="font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Address */}
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[12px] uppercase tracking-[0.1em]" style={{ color: "#78716C" }}>
            Address *
          </label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            required
            placeholder="e.g. 1234 Chestnut St"
            className="font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
            style={inputStyle}
          />
        </div>

        {/* Price + Rating */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[12px] uppercase tracking-[0.1em]" style={{ color: "#78716C" }}>
              Price range *
            </label>
            <div className="flex gap-2">
              {PRICES.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrice(p)}
                  className="flex-1 font-sans text-[13px] py-2 rounded-lg transition-colors"
                  style={{
                    background: price === p ? "#1C1917" : "#FFFFFF",
                    color:      price === p ? "#FAF6F0" : "#1C1917",
                    border:     "1px solid #E7E5E4",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[12px] uppercase tracking-[0.1em]" style={{ color: "#78716C" }}>
              Rating (0–5)
            </label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={rating}
              onChange={e => setRating(e.target.value)}
              className="font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <p className="font-sans text-[13px]" style={{ color: "#E7000B" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full font-sans text-[15px] font-medium py-3 rounded-lg transition-opacity mt-2"
          style={{ background: "#C2410C", color: "#FFFFFF", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Adding place…" : "Add place"}
        </button>
      </form>
    </div>
  );
}
