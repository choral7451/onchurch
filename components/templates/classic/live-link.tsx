"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { type Lang, pick } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

type Props = {
  slug: string;
  initialLive: boolean;
  sermonsHref: string | null; // 말씀 페이지(라이브 임베드가 있는 곳). 말씀 페이지가 꺼져 있으면 null.
  youtubeUrl: string | null;
  lang: Lang;
};

// 예배 안내 섹션의 실시간 예배 링크. 방송 상태(온에어)에 따라 모양과 목적지가 달라진다.
// - 온에어: 빨간 점 + '지금 예배 중' → 말씀 페이지(페이지 안에서 바로 재생)
// - 오프: 조용한 '유튜브 채널' 링크 (채널이 없으면 아무것도 표시하지 않음)
// LiveBadge/SermonLive 와 같은 주기(90초)로 live-status 를 폴링해 자동 갱신한다.
export function ClassicLiveLink({ slug, initialLive, sermonsHref, youtubeUrl, lang }: Props) {
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

  if (live) {
    const label = pick(lang, { ko: "지금 예배 중", en: "Live now" });
    const sub = pick(lang, { ko: "실시간 예배 보기", en: "Watch live" });
    const inner = (
      <>
        <span className="chc-live-dot" aria-hidden="true" />
        <span className="chc-live-text"><b>{label}</b><span>{sub}</span></span>
      </>
    );
    // 말씀 페이지가 있으면 사이트 안에서 재생, 없으면 유튜브 채널로.
    if (sermonsHref) return <Link href={sermonsHref} className="chc-live-btn is-live" aria-live="polite">{inner}</Link>;
    if (youtubeUrl) return <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="chc-live-btn is-live" aria-live="polite">{inner}</a>;
    return null;
  }

  if (!youtubeUrl) return null;
  return (
    <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="chc-live-btn">
      <Icon.play style={{ width: 14, height: 14 }} />
      <span>{pick(lang, { ko: "유튜브 채널", en: "YouTube channel" })}</span>
    </a>
  );
}
