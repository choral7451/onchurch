"use client";

import { useEffect, useRef, useState } from "react";

// 스크롤로 화면에 들어오면 아래에서 위로 살짝 올라오며 페이드인되는 래퍼.
// 홈 섹션마다 감싸서 사용한다. 모션 최소화 설정이면 애니메이션 없이 바로 보인다.
export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""}`}
      style={delay ? ({ transitionDelay: `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
