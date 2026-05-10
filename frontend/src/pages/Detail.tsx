import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../hooks/useApi";
import Rating from "../components/ui/Rating";
import ExplanationCard from "../components/ExplanationCard";

const TABS = ["Overview", "Reviews", "Photos", "Menu", "About"] as const;
type Tab = (typeof TABS)[number];

function Lightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const prev = useCallback(() => setIdx((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  const IMG_W = "min(920px, 90vw)";
  const IMG_H = "min(600px, 72vh)";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5"
      style={{ background: "rgba(10,8,7,0.96)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
        style={{ color: "rgba(250,246,240,0.6)", border: "1px solid rgba(250,246,240,0.12)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Image + side arrows */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: IMG_W, height: IMG_H }}
        onClick={(e) => e.stopPropagation()}
      >
        {photos.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute -left-5 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: "rgba(250,246,240,0.10)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(250,246,240,0.16)",
              color: "#FAF6F0",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        <img
          key={idx}
          src={photos[idx]}
          alt=""
          className="rounded-2xl object-contain"
          style={{
            maxWidth: IMG_W,
            maxHeight: IMG_H,
            boxShadow: "0 40px 100px rgba(0,0,0,0.75)",
          }}
        />

        {photos.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute -right-5 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: "rgba(250,246,240,0.10)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(250,246,240,0.16)",
              color: "#FAF6F0",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* Counter + thumbnails */}
      <div
        className="flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="font-sans text-[11px] tabular-nums"
          style={{ color: "rgba(250,246,240,0.35)", letterSpacing: "0.08em" }}
        >
          {idx + 1} of {photos.length}
        </div>

        {photos.length > 1 && (
          <div
            className="flex gap-1.5 overflow-x-auto pb-1"
            style={{ maxWidth: "min(920px, 90vw)" }}
          >
            {photos.map((src, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="shrink-0 rounded-lg overflow-hidden transition-all duration-150"
                style={{
                  width: 54,
                  height: 38,
                  opacity: i === idx ? 1 : 0.3,
                  outline: i === idx ? "2px solid #C2410C" : "2px solid transparent",
                  outlineOffset: 2,
                  transform: i === idx ? "scale(1.05)" : "scale(1)",
                }}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: b, loading } = useBusiness(id);
  const [tab, setTab] = useState<Tab>("Overview");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

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
      {(() => {
        const allPhotos = b.gallery.length > 0 ? b.gallery : [b.image];
        const photo = (i: number) => allPhotos[i] || b.image;
        const extra = Math.max(0, allPhotos.length - 5);
        const tileClass = "rounded-xl overflow-hidden cursor-pointer relative group";
        const imgClass = "w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]";
        return (
          <div
            className="grid grid-cols-4 gap-3 mb-10"
            style={{ height: "clamp(240px, 35vw, 420px)" }}
          >
            <div className={`col-span-2 row-span-2 ${tileClass}`} onClick={() => setLightboxIdx(0)}>
              <img src={photo(0)} alt="" className={imgClass} />
            </div>
            <div className={tileClass} onClick={() => setLightboxIdx(1)}>
              <img src={photo(1)} alt="" className={imgClass} />
            </div>
            <div className={tileClass} onClick={() => setLightboxIdx(2)}>
              <img src={photo(2)} alt="" className={imgClass} />
            </div>
            <div className={tileClass} onClick={() => setLightboxIdx(3)}>
              <img src={photo(3)} alt="" className={imgClass} />
            </div>
            <div className={tileClass} onClick={() => setLightboxIdx(4)}>
              <img src={photo(4)} alt="" className={imgClass} />
              {extra > 0 && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ background: "rgba(28,25,23,0.45)" }}
                >
                  <span className="font-sans text-white text-[13px]">+ {extra} photos</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          photos={b.gallery.length > 0 ? b.gallery : [b.image]}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

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
            {b.hours && (
              <span className="font-sans text-[13px]" style={{ color: "#78716C" }}>
                · closes {b.hours.split(" – ")[1]}
              </span>
            )}
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
