"use client";

import { useEffect, useState } from "react";
import { parseYouTubeId } from "@/lib/youtube";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

type Props = {
  slug: string;
  initialLive: boolean;
  initialVideoId: string | null;
  liveUrl: string | null;
};

// 말씀 페이지 상단 실시간 방송 플레이어.
// 관리자가 등록한 라이브 영상 URL의 영상ID로 페이지 안에서 임베드 재생한다(유튜브 이동 없음).
// 켜둔 페이지에서도 90초마다 우리 서버(live-status)를 폴링해 자동 갱신.
export function SermonLive({ slug, initialLive, initialVideoId, liveUrl }: Props) {
  const [live, setLive] = useState(initialLive);
  const [videoId, setVideoId] = useState(initialVideoId);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/live-status`, { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        if (stopped) return;
        setLive(!!body?.item?.isLive);
        setVideoId(body?.item?.videoId ?? null);
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

  // 서버가 파싱한 영상ID 우선, 없으면 liveUrl에서 직접 파싱.
  const vid = videoId ?? parseYouTubeId(liveUrl ?? undefined);
  if (!vid) return null;

  return (
    <div className="sermon-live">
      <div className="sermon-live-head">
        <span className="onair-dot" aria-hidden="true" />
        <span className="sermon-live-title">실시간 예배 중계</span>
      </div>
      <div className="sermon-live-video">
        <iframe
          src={`https://www.youtube.com/embed/${encodeURIComponent(vid)}?autoplay=1`}
          title="실시간 예배"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
