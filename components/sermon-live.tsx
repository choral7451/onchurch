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

  // 서버가 해석한 채널ID 우선, 없으면 URL에서 직접 추출 → 유튜브로 이동 없이 페이지 내 임베드.
  const cid = channelId ?? channelIdFromUrl(youtubeUrl);
  if (!cid) return null;

  return (
    <div className="sermon-live">
      <div className="sermon-live-head">
        <span className="onair-dot" aria-hidden="true" />
        <span className="sermon-live-title">실시간 예배 중계</span>
      </div>
      <div className="sermon-live-video">
        <iframe
          src={`https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(cid)}&autoplay=1`}
          title="실시간 예배"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
