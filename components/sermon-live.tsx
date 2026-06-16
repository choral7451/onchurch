"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

// youtubeUrl이 /channel/UC... 또는 ?channel=UC... 형식이면 채널ID를 직접 추출 (서버 해석 없이도 임베드 가능).
function channelIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  return url.match(/\/channel\/(UC[\w-]{20,})/)?.[1] ?? url.match(/[?&]channel=(UC[\w-]{20,})/)?.[1] ?? null;
}

type Props = {
  slug: string;
  initialLive: boolean;
  initialChannelId: string | null;
  initialVideoId: string | null;
  youtubeUrl: string | null;
};

// 말씀 페이지 상단 실시간 방송 플레이어.
// 채널ID가 있으면 채널 기준 라이브 임베드(주소가 방송마다 바뀌지 않음),
// 없으면 유튜브로 이동하는 버튼으로 폴백. 라이브가 아니면 아무것도 렌더하지 않는다.
export function SermonLive({ slug, initialLive, initialChannelId, initialVideoId, youtubeUrl }: Props) {
  const [live, setLive] = useState(initialLive);
  const [channelId, setChannelId] = useState(initialChannelId);
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
        setChannelId(body?.item?.channelId ?? null);
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

  // 실제 라이브 영상ID로 임베드하는 게 가장 안정적. 없으면 채널 기준 임베드로 폴백.
  const cid = channelId ?? channelIdFromUrl(youtubeUrl);
  const src = videoId
    ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1`
    : cid
      ? `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(cid)}&autoplay=1`
      : null;
  if (!src) return null;

  return (
    <div className="sermon-live">
      <div className="sermon-live-head">
        <span className="onair-dot" aria-hidden="true" />
        <span className="sermon-live-title">실시간 예배 중계</span>
      </div>
      <div className="sermon-live-video">
        <iframe
          src={src}
          title="실시간 예배"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
