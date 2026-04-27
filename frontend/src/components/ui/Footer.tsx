export default function Footer() {
  return (
    <footer className="mt-24 pb-12">
      <div className="mx-auto px-4 sm:px-8" style={{ maxWidth: 1280 }}>
        <div
          className="pt-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4"
          style={{ borderTop: "1px solid #E7E5E4" }}
        >
          <div>
            <div
              className="font-serif italic"
              style={{ color: "#1C1917", fontSize: 28, lineHeight: 1.3 }}
            >
              A small guide,
              <br />
              carefully kept.
            </div>
            <div className="font-sans text-[12px] mt-3" style={{ color: "#78716C" }}>
              MINE-4201 · Hybrid recommender prototype · Built on Yelp Open Dataset
            </div>
          </div>
          <div
            className="font-sans text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "#78716C" }}
          >
            Issue 04 · Spring
          </div>
        </div>
      </div>
    </footer>
  );
}
