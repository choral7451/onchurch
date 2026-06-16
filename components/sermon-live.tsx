"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

type Props = {
  slug: string;
  initialLive: boolean;
  initialChannelId: string | null;
  youtubeUrl: string | null;
};

// 말씀 페이지 상단 실시간 방송 플레이어.
// 채널ID가 있으면 채널 기준 라이브 임베드(주소가 방송마다 바뀌지 않음),
// 없으면 유튜브로 이동하는 버튼으로 폴백. 라이브가 아니면 아무것도 렌더하지 않는다.
export function SermonLive({ slug, initialLive, initialChannelId, youtubeUrl }: Props) {
  const [live, setLive] = useState(initialLive);
  const [channelId, setChannelId] = useState(initialChannelId);

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
        setChannelId(body?.item?.channelId ?? null);
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
    <div className="sermon-live">
      <div className="sermon-live-head">
        <span className="onair-dot" aria-hidden="true" />
        <span className="sermon-live-title">실시간 예배 중계</span>
      </div>
      {channelId ? (
        <div className="sermon-live-video">
          <iframe
            src={`https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&autoplay=1`}
            title="실시간 예배"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : youtubeUrl ? (
        <a href={youtubeUrl} target="_blank" rel="noreferrer noopener" className="btn btn-primary">
          ▶ 유튜브에서 실시간 예배 보기
        </a>
      ) : null}
    </div>
  );
}
