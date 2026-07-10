"use client";

import { useEffect, useRef, useState } from "react";

// Hero 라이브 임베드: 실제 교회 사이트를 데스크톱 폭(LOGICAL_W)으로 렌더한 뒤
// 컨테이너 폭에 맞춰 축소한다. cqw 단위는 transform 안에서 지원이 불안정해
// (CSS.supports('transform','scale(calc(100cqw/…))') === false 인 브라우저 존재)
// ResizeObserver로 스케일을 직접 계산한다.
const LOGICAL_W = 1760;
const LOGICAL_H = 1180;

export function HeroPreview({ slug, name, href }: { slug: string; name: string; href: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / LOGICAL_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="landing-hero-visual">
      <div className="hero-browser">
        <div className="hero-browser-bar">
          <span className="hero-browser-dot" />
          <span className="hero-browser-dot" />
          <span className="hero-browser-dot" />
          <span className="hero-browser-url">{slug}.everychurch.co.kr</span>
        </div>
        <div className="hero-browser-viewport" ref={viewportRef}>
          <iframe
            className="hero-browser-frame"
            src={`https://${slug}.everychurch.co.kr`}
            title={`${name} 홈페이지 미리보기`}
            loading="lazy"
            scrolling="no"
            tabIndex={-1}
            aria-hidden="true"
            style={{
              width: LOGICAL_W,
              height: LOGICAL_H,
              transform: `scale(${scale})`,
              opacity: scale ? 1 : 0,
            }}
          />
        </div>
        <a
          className="hero-browser-overlay"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} 홈페이지 새 창에서 보기`}
        />
      </div>
      <span className="hero-visual-tag">실시간 운영 중인 {name}</span>
    </div>
  );
}
