"use client";

import { useEffect, useRef, useState } from "react";

export type ClassicHeroSlide = {
  id: number | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
};

const AUTO_ADVANCE_MS = 6000;

// 충현교회 스타일 전체폭 히어로 슬라이더. 배너가 없으면 교회명 폴백 한 장을 노출한다.
export function ClassicHero({ slides }: { slides: ClassicHeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const total = slides.length;
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

  if (total === 0) return null;

  const goTo = (i: number) => setIndex(((i % total) + total) % total);

  return (
    <section
      className="chc-hero"
      aria-label="홈 배너"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className="chc-hero-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => (
          <ClassicSlide key={s.id ?? `slide-${i}`} slide={s} active={i === index} />
        ))}
      </div>

      {hasSlider && (
        <>
          <button type="button" className="chc-hero-nav prev" aria-label="이전 배너" onClick={() => goTo(index - 1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
          </button>
          <button type="button" className="chc-hero-nav next" aria-label="다음 배너" onClick={() => goTo(index + 1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
          <div className="chc-hero-dots" role="tablist">
            {slides.map((s, i) => (
              <button
                key={s.id ?? `dot-${i}`}
                type="button"
                className={`chc-hero-dot ${i === index ? "active" : ""}`}
                aria-label={`${i + 1}번 배너로 이동`}
                aria-selected={i === index}
                role="tab"
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ClassicSlide({ slide, active }: { slide: ClassicHeroSlide; active: boolean }) {
  const hasText = Boolean(slide.title || slide.description);
  const inner = (
    <div
      className={`chc-hero-slide ${slide.imageUrl ? "" : "chc-hero-slide-plain"}`}
      style={slide.imageUrl ? { backgroundImage: `url("${slide.imageUrl}")` } : undefined}
      aria-hidden={!active}
    >
      {slide.imageUrl && <span className="chc-hero-scrim" aria-hidden="true" />}
      {hasText && (
        <div className="chc-hero-caption">
          {slide.title && <h2 className="chc-hero-title">{slide.title}</h2>}
          {slide.description && <p className="chc-hero-desc">{slide.description}</p>}
        </div>
      )}
    </div>
  );
  if (slide.linkUrl) {
    return (
      <a href={slide.linkUrl} target="_blank" rel="noopener noreferrer" className="chc-hero-cell">{inner}</a>
    );
  }
  return <div className="chc-hero-cell">{inner}</div>;
}
