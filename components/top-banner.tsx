type PublicBanner = {
  id: number | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isDefault: boolean;
};

export function TopBanner({ banners }: { banners: PublicBanner[] }) {
  if (!banners || banners.length === 0) return null;

  return (
    <section className="top-banner-section" aria-label="홈 배너">
      {banners.map((b, i) => {
        const inner = (
          <div
            className={`top-banner ${b.isDefault ? "top-banner-default" : ""}`}
            style={
              b.imageUrl
                ? { backgroundImage: `linear-gradient(180deg, oklch(0 0 0 / 0.35), oklch(0 0 0 / 0.55)), url("${b.imageUrl}")` }
                : undefined
            }
          >
            <div className="top-banner-inner">
              <h2 className="top-banner-title">{b.title}</h2>
              {b.description && <p className="top-banner-desc">{b.description}</p>}
            </div>
          </div>
        );
        return (
          <div key={b.id ?? `default-${i}`}>
            {b.linkUrl ? (
              <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="top-banner-link">
                {inner}
              </a>
            ) : (
              inner
            )}
          </div>
        );
      })}
    </section>
  );
}
