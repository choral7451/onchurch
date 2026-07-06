"use client";

import { useEffect } from "react";

// 랜딩 섹션이 처음 화면에 들어올 때 GA4로 section_view 이벤트 1회 전송.
// GA4 탐색 > 유입경로(Funnel)에서 section_id를 순서대로 놓으면 섹션별 이탈률을 볼 수 있다.
// (GA는 landing 도메인에서만 로드되므로 gtag가 없으면 조용히 무시된다.)
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function SectionTracker() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-section]");
    if (els.length === 0) return;

    const sent = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const id = el.dataset.section;
          if (!id || sent.has(id)) continue;
          sent.add(id);
          window.gtag?.("event", "section_view", {
            section_id: id,
            section_index: Number(el.dataset.sectionIndex ?? 0),
          });
          observer.unobserve(el);
        }
      },
      // 섹션 상단이 뷰포트 하단에서 25% 지점까지 올라오면 "봤다"로 집계.
      // 화면보다 긴 섹션도 안정적으로 잡히도록 threshold 대신 rootMargin을 사용.
      { rootMargin: "0px 0px -25% 0px", threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
