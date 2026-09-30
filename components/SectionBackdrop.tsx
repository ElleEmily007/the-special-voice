/** Slow light and an optional photograph behind a home-page section. */
export default function SectionBackdrop({
  tone,
  imageSrc,
}: {
  tone: "navy" | "cream";
  imageSrc?: string;
}) {
  const navy = tone === "navy";

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      {imageSrc && (
        <>
          {/* CSS background, not <img>, so image blockers cannot rewrite the node before hydration. */}
          <div
            className={`absolute inset-0 bg-cover bg-center ${
              navy ? "opacity-[0.55]" : "opacity-[0.58]"
            }`}
            style={{ backgroundImage: `url(${imageSrc})` }}
          />
          <div
            className={`absolute inset-0 ${
              navy ? "section-photo-overlay-navy" : "section-photo-overlay-cream"
            }`}
          />
        </>
      )}

      <div
        className={`section-orb absolute -top-24 -left-16 h-80 w-80 rounded-full blur-3xl ${
          navy ? "bg-[#e8b800]/10" : "bg-[#e8b800]/12"
        }`}
      />
      <div
        className={`section-orb-slow absolute -bottom-28 -right-10 h-96 w-96 rounded-full blur-3xl ${
          navy ? "bg-[#f5c842]/8" : "bg-[#0f2035]/6"
        }`}
      />
      <div
        className={`section-wash absolute inset-0 ${navy ? "" : "section-wash-cream"}`}
      />
    </div>
  );
}
