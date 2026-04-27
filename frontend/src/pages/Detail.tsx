import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../hooks/useApi";
import Rating from "../components/ui/Rating";
import ExplanationCard from "../components/ExplanationCard";

const TABS = ["Overview", "Reviews", "Photos", "Menu", "About"] as const;
type Tab = (typeof TABS)[number];

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: b, loading } = useBusiness(id);
  const [tab, setTab] = useState<Tab>("Overview");

  if (loading || !b) return (
    <div className="mx-auto px-4 sm:px-8 pt-20 text-center" style={{ maxWidth: 1280 }}>
      <div className="font-serif italic text-[18px]" style={{ color: "#78716C" }}>Loading…</div>
    </div>
  );

  return (
    <div className="mx-auto px-4 sm:px-8 pt-8" style={{ maxWidth: 1280 }}>
      {/* Breadcrumb */}
      <div className="font-sans text-[12px] mb-5" style={{ color: "#78716C" }}>
        <button onClick={() => navigate("/search")} className="hover:underline">
          Search
        </button>
        <span className="mx-2">›</span>
        <span style={{ color: "#1C1917" }}>{b.name}</span>
      </div>

      {/* Gallery mosaic */}
      <div
        className="grid grid-cols-4 gap-3 mb-10"
        style={{ height: "clamp(240px, 35vw, 420px)" }}
      >
        <div className="col-span-2 row-span-2 rounded-xl overflow-hidden">
          <img src={b.gallery[0]} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="rounded-xl overflow-hidden">
          <img
            src={b.gallery[1] || b.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <img
            src={b.gallery[2] || b.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <img
            src={b.gallery[3] || b.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="rounded-xl overflow-hidden relative">
          <img
            src={b.gallery[4] || b.image}
            alt=""
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(28,25,23,0.45)" }}
          >
            <span className="font-sans text-white text-[13px]">+ {b.gallery.length} photos</span>
          </div>
        </div>
      </div>

      {/* Title block */}
      <div
        className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-10 pb-10"
        style={{ borderBottom: "1px solid #E7E5E4" }}
      >
        <div className="sm:col-span-8">
          <div
            className="font-sans text-[11px] uppercase tracking-[0.22em] mb-3"
            style={{ color: "#C2410C" }}
          >
            {b.category} · {b.neighborhood}
          </div>
          <h1
            className="font-serif"
            style={{
              color: "#1C1917",
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: 1,
              letterSpacing: "-0.025em",
              fontWeight: 400,
            }}
          >
            {b.name}
          </h1>
          <div className="flex items-center gap-5 mt-5 flex-wrap">
            <Rating value={b.rating} size={14} />
            <span className="font-sans text-[13px] tabular-nums" style={{ color: "#78716C" }}>
              {b.reviews.toLocaleString()} reviews
            </span>
            <span style={{ color: "#E7E5E4" }}>·</span>
            <span className="font-sans text-[13px] tabular-nums" style={{ color: "#1C1917" }}>
              {b.price}
            </span>
            <span style={{ color: "#E7E5E4" }}>·</span>
            <span className="font-sans text-[13px]" style={{ color: "#1C1917" }}>
              Open now
            </span>
            <span className="font-sans text-[13px]" style={{ color: "#78716C" }}>
              · closes {b.hours.split(" – ")[1]}
            </span>
          </div>
        </div>
        <div className="sm:col-span-4 flex items-end justify-start sm:justify-end gap-2 flex-wrap">
          <button
            className="font-sans text-[13px] px-4 py-2.5 rounded-full transition-all hover:-translate-y-[2px]"
            style={{ background: "#FFFFFF", color: "#1C1917", border: "1px solid #E7E5E4" }}
          >
            ♡ Save
          </button>
          <button
            className="font-sans text-[13px] font-medium px-5 py-2.5 rounded-full transition-all hover:-translate-y-[2px]"
            style={{ background: "#C2410C", color: "white" }}
          >
            Reserve a table
          </button>
        </div>
      </div>

      {/* Two columns */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-12 pt-10"
      >
        {/* Left — tabs */}
        <div>
          <div
            className="flex items-center gap-1 mb-8 overflow-x-auto"
            style={{ borderBottom: "1px solid #E7E5E4" }}
          >
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="font-sans text-[13px] px-4 py-3 transition-colors relative whitespace-nowrap"
                style={{ color: tab === t ? "#1C1917" : "#78716C", fontWeight: tab === t ? 500 : 400 }}
              >
                {t}
                {tab === t && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: "#C2410C" }}
                  />
                )}
              </button>
            ))}
          </div>

          {tab === "Overview" && (
            <div className="space-y-8">
              <div>
                <p
                  className="font-serif"
                  style={{ color: "#1C1917", fontSize: 22, lineHeight: 1.5, letterSpacing: "-0.005em" }}
                >
                  <span style={{ fontStyle: "italic", color: "#C2410C" }}>"</span>
                  {b.whyPicked}
                  <span style={{ fontStyle: "italic", color: "#C2410C" }}>"</span>
                </p>
                <div
                  className="font-sans text-[11px] uppercase tracking-[0.18em] mt-4"
                  style={{ color: "#78716C" }}
                >
                  — Lantern editors
                </div>
              </div>

              <div>
                <h3
                  className="font-serif mb-3"
                  style={{ color: "#1C1917", fontSize: 22, fontWeight: 500 }}
                >
                  Atmosphere
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {b.attributes.concat(b.tags).map((a) => (
                    <span
                      key={a}
                      className="font-sans text-[12px] px-3 py-1.5 rounded-full"
                      style={{
                        color: "#1C1917",
                        background: "#FAF6F0",
                        border: "1px solid #E7E5E4",
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3
                  className="font-serif mb-4"
                  style={{ color: "#1C1917", fontSize: 22, fontWeight: 500 }}
                >
                  Recent reviews
                </h3>
                <div className="space-y-5">
                  {b.reviewList.slice(0, 2).map((r, i) => (
                    <div
                      key={i}
                      className="pb-5"
                      style={{
                        borderBottom:
                          i < 1 ? "1px solid #E7E5E4" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="font-sans text-[13px]"
                          style={{ color: "#1C1917", fontWeight: 500 }}
                        >
                          {r.author}
                        </div>
                        <Rating value={r.rating} />
                      </div>
                      <p
                        className="font-serif"
                        style={{ color: "#1C1917", fontSize: 16, lineHeight: 1.55 }}
                      >
                        "{r.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "Reviews" && (
            <div className="space-y-6">
              {b.reviewList.map((r, i) => (
                <div
                  key={i}
                  className="pb-6"
                  style={{
                    borderBottom:
                      i < b.reviewList.length - 1 ? "1px solid #E7E5E4" : "none",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="font-sans text-[14px]"
                      style={{ color: "#1C1917", fontWeight: 500 }}
                    >
                      {r.author}
                    </div>
                    <Rating value={r.rating} size={13} />
                  </div>
                  <p
                    className="font-serif"
                    style={{ color: "#1C1917", fontSize: 17, lineHeight: 1.55 }}
                  >
                    "{r.text}"
                  </p>
                </div>
              ))}
            </div>
          )}

          {(tab === "Photos" || tab === "Menu" || tab === "About") && (
            <div className="font-serif italic" style={{ color: "#78716C", fontSize: 16 }}>
              {tab} content — illustrative placeholder.
            </div>
          )}
        </div>

        {/* Right rail */}
        <div>
          <div className="lg:sticky lg:top-24 space-y-5">
            {/* Info card */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#FFFFFF", border: "1px solid #E7E5E4" }}
            >
              <div
                className="font-sans text-[11px] uppercase tracking-[0.18em] mb-3"
                style={{ color: "#78716C" }}
              >
                Visit
              </div>
              <div className="space-y-2.5 font-sans text-[13px]" style={{ color: "#1C1917" }}>
                <div className="flex justify-between gap-4">
                  <span style={{ color: "#78716C" }}>Address</span>
                  <span className="text-right">{b.address}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: "#78716C" }}>Hours</span>
                  <span className="text-right tabular-nums">{b.hours}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: "#78716C" }}>Price</span>
                  <span className="text-right tabular-nums">{b.price}</span>
                </div>
              </div>
            </div>

            {/* Explanation card */}
            <ExplanationCard b={b} />
          </div>
        </div>
      </div>
    </div>
  );
}
