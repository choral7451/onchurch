"use client";

import { useEffect, useRef, useState } from "react";

type PublicBanner = {
  id: number | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isDefault: boolean;
};

const AUTO_ADVANCE_MS = 5000;

export function TopBanner({ banners }: { banners: PublicBanner[] }) {
  const [index, setIndex] = useState(0);
  const total = banners?.length ?? 0;
  const hasSlider = total > 1;
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!hasSlider) return;
    const tick = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % total);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(tick);
  }, [hasSlider, total]);

  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [total, index]);

  if (!banners || total === 0) return null;

  function goTo(i: number) {
    setIndex(((i % total) + total) % total);
  }

  return (
    <section
      className="top-banner-section"
      aria-label="홈 배너"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className={`top-banner-slider ${hasSlider ? "" : "is-single"}`}>
        <div
          className="top-banner-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((b, i) => (
            <div className="top-banner-slide" key={b.id ?? `default-${i}`} aria-hidden={i !== index}>
              <BannerCard banner={b} />
            </div>
          ))}
        </div>

        {hasSlider && (
          <>
            <button
              type="button"
              className="top-banner-nav prev"
              aria-label="이전 배너"
              onClick={() => goTo(index - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="top-banner-nav next"
              aria-label="다음 배너"
              onClick={() => goTo(index + 1)}
            >
              ›
            </button>
            <div className="top-banner-dots" role="tablist">
              {banners.map((b, i) => (
                <button
                  key={b.id ?? `dot-${i}`}
                  type="button"
                  className={`top-banner-dot ${i === index ? "active" : ""}`}
                  aria-label={`${i + 1}번 배너로 이동`}
                  aria-selected={i === index}
                  role="tab"
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function BannerCard({ banner }: { banner: PublicBanner }) {
  const hasText = Boolean(banner.title || banner.description);
  const inner = (
    <div
      className={`top-banner ${banner.isDefault ? "top-banner-default" : ""} ${hasText ? "" : "top-banner-plain"}`}
      style={
        banner.imageUrl
          ? hasText
            ? { backgroundImage: `linear-gradient(180deg, oklch(0 0 0 / 0.35), oklch(0 0 0 / 0.55)), url("${banner.imageUrl}")` }
            : { backgroundImage: `url("${banner.imageUrl}")` }
          : undefined
      }
    >
      {hasText && (
        <div className="top-banner-inner">
          {banner.title && <h2 className="top-banner-title">{banner.title}</h2>}
          {banner.description && <p className="top-banner-desc">{banner.description}</p>}
        </div>
      )}
    </div>
  );

  if (banner.linkUrl) {
    return (
      <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="top-banner-link">
        {inner}
      </a>
    );
  }
  return inner;
}
