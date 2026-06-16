"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

// 홈 메인의 ON AIR 배지. 서버에서 받은 초기 상태로 즉시 렌더하고,
// 켜둔 페이지에서도 90초마다 우리 서버(live-status)를 폴링해 자동 갱신한다.
// (우리 서버는 캐시 기반이라 유튜브 할당량과 무관)
export function LiveBadge({ slug, sermonsHref, initialLive }: { slug: string; sermonsHref: string; initialLive: boolean }) {
  const [live, setLive] = useState(initialLive);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/live-status`, { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        if (!stopped) setLive(!!body?.item?.isLive);
      } catch {
        /* 다음 주기에 재시도 */
      }
    };
    const timer = setInterval(check, 90_000);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [slug]);

  if (!live) return null;

  return (
    <div className="onair-bar">
      <Link href={sermonsHref} className="onair-badge">
        <span className="onair-dot" aria-hidden="true" />
        ON AIR
        <span className="onair-label">실시간 예배 보기</span>
      </Link>
    </div>
  );
}
