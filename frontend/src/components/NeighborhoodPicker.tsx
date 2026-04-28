import { useState } from "react";
import { CITY_CENTERS, CITY_NEIGHBORHOODS, useNeighborhood } from "../contexts/NeighborhoodContext";

const CITY_NAMES = Object.keys(CITY_CENTERS);

const T = {
  ink:        "#1C1917",
  muted:      "#78716C",
  border:     "#E7E5E4",
  terracotta: "#C2410C",
  surface:    "#FFFFFF",
  canvas:     "#FAF6F0",
};

interface NeighborhoodPickerProps {
  onClose: () => void;
}

export default function NeighborhoodPicker({ onClose }: NeighborhoodPickerProps) {
  const { city, neighborhood, setCity, setNeighborhood } = useNeighborhood();

  const [step, setStep]       = useState<"city" | "hood">(city ? "city" : "city");
  const [selCity, setSelCity] = useState(city || "Philadelphia");
  const [selHood, setSelHood] = useState(neighborhood || "");

  const cityHoods = CITY_NEIGHBORHOODS[selCity] ? Object.keys(CITY_NEIGHBORHOODS[selCity]) : [];

  function confirmCity() {
    if (cityHoods.length > 0) {
      setStep("hood");
    } else {
      setCity(selCity);
      setNeighborhood("");
      onClose();
    }
  }

  function confirmHood() {
    setCity(selCity);
    setNeighborhood(selHood);
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(28,25,23,0.45)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      <div
        className="fixed z-50 rounded-2xl p-8 w-full"
        style={{
          background: T.canvas,
          border: `1px solid ${T.border}`,
          maxWidth: 440,
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 24px 64px rgba(28,25,23,0.18)",
        }}
      >
        {/* Step: city */}
        {step === "city" && (
          <>
            <div className="font-sans text-[11px] uppercase tracking-[0.22em] mb-3" style={{ color: T.terracotta }}>
              Step 1 of 2 — City
            </div>
            <h2 className="font-serif mb-2" style={{ color: T.ink, fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Where are you eating tonight?
            </h2>
            <p className="font-serif italic mb-6" style={{ color: T.muted, fontSize: 15, lineHeight: 1.5 }}>
              We use this to filter recommendations to your city.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {CITY_NAMES.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelCity(c)}
                  className="text-left px-3 py-2.5 rounded-xl font-sans text-[13px] transition-all hover:-translate-y-[1px]"
                  style={{
                    background: selCity === c ? T.ink : T.surface,
                    color:      selCity === c ? T.canvas : T.ink,
                    border: `1px solid ${selCity === c ? T.ink : T.border}`,
                  }}
                >
                  <div style={{ fontWeight: selCity === c ? 500 : 400 }}>{c}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: selCity === c ? "rgba(250,246,240,0.6)" : T.muted }}>
                    {CITY_CENTERS[c].label.split(", ")[1]}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              {city && (
                <button onClick={onClose} className="flex-1 font-sans text-[13px] py-3 rounded-full"
                  style={{ color: T.muted, border: `1px solid ${T.border}`, background: T.surface }}>
                  Cancel
                </button>
              )}
              <button onClick={confirmCity}
                className="flex-1 font-sans text-[13px] font-medium py-3 rounded-full transition-all hover:-translate-y-[1px]"
                style={{ background: T.ink, color: T.canvas }}>
                {cityHoods.length > 0 ? "Next: neighborhood →" : "Set city →"}
              </button>
            </div>
          </>
        )}

        {/* Step: neighborhood */}
        {step === "hood" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setStep("city")} className="font-sans text-[11px]" style={{ color: T.muted }}>
                ← {selCity}
              </button>
              <div className="font-sans text-[11px] uppercase tracking-[0.22em]" style={{ color: T.terracotta }}>
                Step 2 of 2 — Neighborhood
              </div>
            </div>
            <h2 className="font-serif mb-2" style={{ color: T.ink, fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Which neighborhood?
            </h2>
            <p className="font-serif italic mb-6" style={{ color: T.muted, fontSize: 15, lineHeight: 1.5 }}>
              Optional — helps center the map and filter nearby.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {cityHoods.map((n) => (
                <button
                  key={n}
                  onClick={() => setSelHood(n === selHood ? "" : n)}
                  className="text-left px-3 py-2.5 rounded-xl font-sans text-[13px] transition-all hover:-translate-y-[1px]"
                  style={{
                    background: selHood === n ? T.ink : T.surface,
                    color:      selHood === n ? T.canvas : T.ink,
                    border: `1px solid ${selHood === n ? T.ink : T.border}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setCity(selCity); setNeighborhood(""); onClose(); }}
                className="flex-1 font-sans text-[13px] py-3 rounded-full"
                style={{ color: T.muted, border: `1px solid ${T.border}`, background: T.surface }}>
                Skip neighborhood
              </button>
              <button onClick={confirmHood}
                className="flex-1 font-sans text-[13px] font-medium py-3 rounded-full transition-all hover:-translate-y-[1px]"
                style={{ background: T.ink, color: T.canvas }}>
                Set location →
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
