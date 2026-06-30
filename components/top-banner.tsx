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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipingRef = useRef(false);

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

  const SWIPE_THRESHOLD = 40;

  function onTouchStart(e: React.TouchEvent) {
    if (!hasSlider) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipingRef.current = false;
    pausedRef.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // 가로 움직임이 세로보다 크면 가로 스와이프로 간주
    if (!swipingRef.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      swipingRef.current = true;
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    pausedRef.current = false;
    if (!start || !swipingRef.current) return;
    const dx = e.changedTouches[0].clientX - start.x;
    if (dx <= -SWIPE_THRESHOLD) goTo(index + 1);
    else if (dx >= SWIPE_THRESHOLD) goTo(index - 1);
  }

  return (
    <section
      className="top-banner-section"
      aria-label="홈 배너"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18 9 12l6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="top-banner-nav next"
              aria-label="다음 배너"
              onClick={() => goTo(index + 1)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
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
