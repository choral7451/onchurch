"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ClassicHeroSlide = {
  id: number | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
};

const AUTO_ADVANCE_MS = 6500;
const SWIPE_THRESHOLD_PX = 40;

// 전통형 전체폭 히어로 슬라이더. 배너가 없으면 교회명 폴백 한 장을 노출한다.
// - 자동 넘김: 마우스 올리거나 포커스 중엔 잠시 멈추고, 일시정지 버튼으로 완전히 멈출 수 있다.
// - prefers-reduced-motion 이면 자동 넘김·배경 영상 자동재생을 끈다.
// - 모바일 스와이프 / 키보드 좌우 화살표 / 점(dot) 탭 모두 지원.
export function ClassicHero({ slides, churchName }: { slides: ClassicHeroSlide[]; churchName: string }) {
  const [rawIndex, setRawIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const total = slides.length;
  const hasSlider = total > 1;
  const index = rawIndex < total ? rawIndex : 0;
  const hoverPausedRef = useRef(false);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((i: number) => setRawIndex(((i % total) + total) % total), [total]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const autoplay = hasSlider && !userPaused && !reducedMotion;
  useEffect(() => {
    if (!autoplay) return;
    const tick = setInterval(() => {
      if (hoverPausedRef.current) return;
      setRawIndex((i) => (i + 1) % total);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(tick);
  }, [autoplay, total]);

  if (total === 0) return null;

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!hasSlider || touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    goTo(dx < 0 ? index + 1 : index - 1);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!hasSlider) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
  };

  return (
    <section
      className="chc-hero"
      aria-label={`${churchName} 홈 배너`}
      aria-roledescription="carousel"
      onMouseEnter={() => { hoverPausedRef.current = true; }}
      onMouseLeave={() => { hoverPausedRef.current = false; }}
      onFocus={() => { hoverPausedRef.current = true; }}
      onBlur={() => { hoverPausedRef.current = false; }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
    >
      <div className={`chc-hero-track ${reducedMotion ? "no-motion" : ""}`} style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => (
          <ClassicSlide key={s.id ?? `slide-${i}`} slide={s} active={i === index} reducedMotion={reducedMotion} />
        ))}
      </div>

      {hasSlider && (
        <>
          <button type="button" className="chc-hero-nav prev" aria-label="이전 배너" onClick={() => goTo(index - 1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
          </button>
          <button type="button" className="chc-hero-nav next" aria-label="다음 배너" onClick={() => goTo(index + 1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
          <div className="chc-hero-bottombar">
            <div className="chc-hero-dots" role="tablist" aria-label="배너 선택">
              {slides.map((s, i) => (
                <button
                  key={s.id ?? `dot-${i}`}
                  type="button"
                  className={`chc-hero-dot ${i === index ? "active" : ""}`}
                  aria-label={`${i + 1}번 배너`}
                  aria-selected={i === index}
                  role="tab"
                  onClick={() => goTo(i)}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="chc-hero-ctrl">
              <span className="chc-hero-counter">
                <b>{String(index + 1).padStart(2, "0")}</b> / {String(total).padStart(2, "0")}
              </span>
              {!reducedMotion && (
                <button
                  type="button"
                  className="chc-hero-pause"
                  aria-label={userPaused ? "배너 자동 넘김 재생" : "배너 자동 넘김 일시정지"}
                  aria-pressed={userPaused}
                  onClick={() => setUserPaused((p) => !p)}
                >
                  {userPaused ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 5v14l11-7z" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ClassicSlide({ slide, active, reducedMotion }: { slide: ClassicHeroSlide; active: boolean; reducedMotion: boolean }) {
  const hasText = Boolean(slide.title || slide.description);
  const isVideo = Boolean(slide.videoUrl);
  const hasMedia = Boolean(slide.imageUrl || isVideo);
  const inner = (
    <div
      className={`chc-hero-slide ${hasMedia ? "" : "chc-hero-slide-plain"}`}
      style={!isVideo && slide.imageUrl ? { backgroundImage: `url("${slide.imageUrl}")` } : undefined}
      aria-hidden={!active}
    >
      {isVideo && (
        <video
          className="chc-hero-video"
          src={slide.videoUrl!}
          autoPlay={!reducedMotion}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      )}
      {hasMedia && <span className="chc-hero-scrim" aria-hidden="true" />}
      {hasText && (
        <div className="chc-hero-caption">
          <span className="chc-hero-rule" aria-hidden="true" />
          {slide.title && <h2 className="chc-hero-title">{slide.title}</h2>}
          {slide.description && <p className="chc-hero-desc">{slide.description}</p>}
          {slide.linkUrl && <span className="chc-hero-cta">자세히 보기</span>}
        </div>
      )}
    </div>
  );
  if (slide.linkUrl) {
    return (
      <a href={slide.linkUrl} target="_blank" rel="noopener noreferrer" className="chc-hero-cell" tabIndex={active ? 0 : -1}>{inner}</a>
    );
  }
  return <div className="chc-hero-cell">{inner}</div>;
}
