import { useState, useEffect } from "react";
import type { ColdStartProfile } from "../types";
import type { Category } from "../types";
import { api } from "../lib/api";

export type { ColdStartProfile };
export const COLD_START_KEY = "lantern_coldstart";

// ── Static step data (occasion / time / price are UX labels, not dataset values) ─

const OCCASIONS = [
  { id: "traveling", label: "Just passing through",  sub: "Show me the city's best",     stars: 0.92 },
  { id: "local",     label: "Regular outing",        sub: "A familiar spot nearby",       stars: 0.75 },
  { id: "date",      label: "Special occasion",      sub: "Make it count",                stars: 0.88 },
  { id: "quick",     label: "Quick & easy",          sub: "Simple, nearby, no fuss",      stars: 0.50 },
];

const TIME_SLOTS = [
  { id: "morning",   label: "Morning",    sub: "6 – 11 AM",    cats: "Coffee, Tea, Breakfast, Brunch" },
  { id: "lunch",     label: "Afternoon",  sub: "11 AM – 3 PM", cats: "Food, Restaurants, Sandwiches" },
  { id: "dinner",    label: "Evening",    sub: "5 – 10 PM",    cats: "Restaurants, Italian, Steakhouses" },
  { id: "latenight", label: "Late night", sub: "After 10 PM",  cats: "Bars, Nightlife, Pizza" },
];

const PRICES = [
  { id: "$",    label: "$",    sub: "Under $15",  val: 1 },
  { id: "$$",   label: "$$",   sub: "$15 – 35",   val: 2 },
  { id: "$$$",  label: "$$$",  sub: "$35 – 60",   val: 3 },
  { id: "$$$$", label: "$$$$", sub: "$60+",        val: 4 },
];

// ── Parameter builder ─────────────────────────────────────────────────────────
// The TF-IDF was trained on comma-separated Yelp category strings.
// token_pattern=[A-Za-z][A-Za-z ]+ treats spaces as part of a token, so
// space-joined words become ONE unknown token. Must use commas as separators.

export function profileToParams(profile: ColdStartProfile) {
  const timeSlot  = TIME_SLOTS.find(t => t.id === profile.timeSlot);
  const occasion  = OCCASIONS.find(o => o.id === profile.occasion);
  const priceItem = PRICES.find(p => p.id === profile.price);

  const parts = [
    ...profile.moods,
    ...(timeSlot?.cats ?? "").split(",").map(s => s.trim()).filter(Boolean),
  ];
  const categories = parts.join(", ") || "Restaurants, Food";
  const stars = occasion?.stars ?? 0.75;
  const price = priceItem?.val ?? 2;

  return { categories, stars, price };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width:      i === current ? 20 : 6,
            height:     6,
            background: i <= current ? "#1C1917" : "#E7E5E4",
          }}
        />
      ))}
    </div>
  );
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  sub?: string;
}
function Chip({ selected, onClick, children, sub }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left px-4 py-3 rounded-xl transition-all duration-150"
      style={{
        background: selected ? "#1C1917" : "#FFFFFF",
        color:      selected ? "#FAF6F0" : "#1C1917",
        border:     selected ? "1px solid #1C1917" : "1px solid #E7E5E4",
      }}
    >
      <div className="font-sans text-[14px] font-medium">{children}</div>
      {sub && (
        <div
          className="font-sans text-[11px] mt-0.5"
          style={{ color: selected ? "rgba(250,246,240,0.65)" : "#A8A29E" }}
        >
          {sub}
        </div>
      )}
    </button>
  );
}

function CategorySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 mb-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl animate-pulse"
          style={{ background: "#E7E5E4" }}
        />
      ))}
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

interface Props {
  onComplete:      (profile: ColdStartProfile) => void;
  onSkip:          () => void;
  /** Pass the existing profile to pre-fill selections (returning user check-in). */
  initialProfile?: ColdStartProfile | null;
}

export default function ColdStartWizard({ onComplete, onSkip, initialProfile }: Props) {
  const isCheckin = initialProfile != null;

  const [step,       setStep]       = useState(0);
  const [moods,      setMoods]      = useState<string[]>(initialProfile?.moods ?? []);
  const [occasion,   setOccasion]   = useState<ColdStartProfile["occasion"] | "">(initialProfile?.occasion ?? "");
  const [timeSlot,   setTimeSlot]   = useState<ColdStartProfile["timeSlot"] | "">(initialProfile?.timeSlot ?? "");
  const [price,      setPrice]      = useState<ColdStartProfile["price"] | "">(initialProfile?.price ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);

  // Fetch real categories from the dataset on mount
  useEffect(() => {
    api.categories()
      .then(setCategories)
      .catch(() => {/* keep empty, skeleton stays until resolved */})
      .finally(() => setCatsLoading(false));
  }, []);

  function toggleMood(name: string) {
    setMoods(prev =>
      prev.includes(name)
        ? prev.filter(m => m !== name)
        : prev.length < 3 ? [...prev, name] : prev
    );
  }

  function canNext(): boolean {
    if (step === 0) return moods.length > 0;
    if (step === 1) return occasion !== "";
    if (step === 2) return timeSlot !== "";
    if (step === 3) return price !== "";
    return false;
  }

  function handleNext() {
    if (step < 3) { setStep(s => s + 1); return; }
    onComplete({
      moods,
      occasion: occasion as ColdStartProfile["occasion"],
      timeSlot: timeSlot as ColdStartProfile["timeSlot"],
      price:    price    as ColdStartProfile["price"],
    });
  }

  const STEP_TITLES = isCheckin
    ? ["What are you up for today?", "What's the plan?", "When are you heading out?", "Budget for today?"]
    : ["What are you looking for?",  "What's the situation?", "When are you heading out?", "How does the bill usually look?"];

  const STEP_SUBS = isCheckin
    ? [
        "Change your picks from last time or keep them.",
        "Any different vibe today?",
        "We'll tune what's shown right now.",
        "Same as usual, or treating yourself?",
      ]
    : [
        "Pick up to three — we'll tune your picks.",
        "Sets how selective we get.",
        "We'll weigh the moment into your picks.",
        "We'll respect it.",
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(28,25,23,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth:   480,
          background: "#FAF6F0",
          boxShadow:  "0 8px 48px rgba(28,25,23,0.22)",
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: "#1C1917" }}
              >
                <span className="font-serif text-[16px] leading-none" style={{ color: "#FAF6F0", fontStyle: "italic" }}>l</span>
              </div>
              <span className="font-serif text-[16px]" style={{ color: "#1C1917" }}>
                {isCheckin ? "Daily check-in" : "Lantern"}
              </span>
            </div>
            <button
              onClick={onSkip}
              className="font-sans text-[12px] underline"
              style={{ color: "#A8A29E" }}
            >
              {isCheckin ? "Keep yesterday's picks" : "Skip for now"}
            </button>
          </div>

          <StepDots current={step} total={4} />

          <h2
            className="font-serif text-[26px] leading-tight mb-1"
            style={{ color: "#1C1917", letterSpacing: "-0.02em" }}
          >
            {STEP_TITLES[step]}
          </h2>
          <p className="font-sans text-[13px] mb-6" style={{ color: "#78716C" }}>
            {STEP_SUBS[step]}
          </p>
        </div>

        {/* Step body */}
        <div className="px-8 pb-8">

          {/* Step 0: Categories from dataset (multi-select, up to 3) */}
          {step === 0 && (
            catsLoading ? <CategorySkeleton /> : (
              <div
                className="grid grid-cols-2 gap-2.5 mb-6 overflow-y-auto"
                style={{ maxHeight: 320 }}
              >
                {categories.map(cat => (
                  <Chip
                    key={cat.name}
                    selected={moods.includes(cat.name)}
                    onClick={() => toggleMood(cat.name)}
                    sub={`${cat.count.toLocaleString()} places`}
                  >
                    {cat.name}
                  </Chip>
                ))}
              </div>
            )
          )}

          {/* Step 1: Occasion */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {OCCASIONS.map(o => (
                <Chip
                  key={o.id}
                  selected={occasion === o.id}
                  onClick={() => setOccasion(o.id as ColdStartProfile["occasion"])}
                  sub={o.sub}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          )}

          {/* Step 2: Time slot */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {TIME_SLOTS.map(t => (
                <Chip
                  key={t.id}
                  selected={timeSlot === t.id}
                  onClick={() => setTimeSlot(t.id as ColdStartProfile["timeSlot"])}
                  sub={t.sub}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          )}

          {/* Step 3: Price */}
          {step === 3 && (
            <div className="grid grid-cols-4 gap-2 mb-6">
              {PRICES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPrice(p.id as ColdStartProfile["price"])}
                  className="flex flex-col items-center py-4 rounded-xl transition-all duration-150"
                  style={{
                    background: price === p.id ? "#1C1917" : "#FFFFFF",
                    color:      price === p.id ? "#FAF6F0" : "#1C1917",
                    border:     price === p.id ? "1px solid #1C1917" : "1px solid #E7E5E4",
                  }}
                >
                  <span className="font-serif text-[18px] font-medium">{p.label}</span>
                  <span
                    className="font-sans text-[10px] mt-1 text-center leading-tight"
                    style={{ color: price === p.id ? "rgba(250,246,240,0.65)" : "#A8A29E" }}
                  >
                    {p.sub}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="font-sans text-[13px] px-5 py-2.5 rounded-full"
                style={{ border: "1px solid #E7E5E4", color: "#78716C", background: "#FFFFFF" }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext()}
              className="flex-1 font-sans text-[14px] font-medium py-2.5 rounded-full transition-opacity"
              style={{
                background: "#C2410C",
                color:      "#FFFFFF",
                opacity:    canNext() ? 1 : 0.35,
              }}
            >
              {step === 3 ? "Show me places →" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
