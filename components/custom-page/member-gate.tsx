"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isLoggedInForChurch, onchurchCustomPage } from "@/lib/api-client";
import { normalizeBlocks, type CustomPageBlock } from "@/lib/custom-page-blocks";
import { CustomPageBlocks } from "@/components/custom-page/blocks";
import { type Lang, pick } from "@/lib/i18n";

type Props = {
  slug: string;
  pageSlug: string;
  lang: Lang;
  loginHref: string;
  // SSR 결과. locked 면 blocks 는 비어 있다.
  initialLocked: boolean;
  initialBlocks: CustomPageBlock[];
};

// 회원공개 커스텀 페이지의 본문 자리.
// SSR 은 쿠키의 액세스 토큰이 만료됐으면 익명으로 렌더링돼 잠긴 채 내려올 수 있다.
// 이 교회에 로그인된 상태면 클라이언트에서 한 번 더 조회해(만료 시 토큰 갱신) 본문을 연다.
export function CustomPageMemberGate({ slug, pageSlug, lang, loginHref, initialLocked, initialBlocks }: Props) {
  const [locked, setLocked] = useState(initialLocked);
  const [blocks, setBlocks] = useState<CustomPageBlock[]>(initialBlocks);
  const [checking, setChecking] = useState(initialLocked);

  useEffect(() => {
    if (!initialLocked) return;
    let cancelled = false;
    // 비로그인이면 조회 없이 바로 잠금 안내로, 로그인 상태면 토큰을 붙여 다시 조회한다.
    const lookup = isLoggedInForChurch(slug) ? onchurchCustomPage.getPublic(slug, pageSlug) : Promise.resolve(null);
    lookup
      .then((page) => {
        if (cancelled || !page || page.locked) return;
        setBlocks(normalizeBlocks(page.blocks));
        setLocked(false);
      })
      .catch(() => {
        // 조회 실패 시 잠긴 상태 그대로 둔다.
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialLocked, slug, pageSlug]);

  if (!locked) {
    return blocks.length > 0 ? (
      <CustomPageBlocks blocks={blocks} />
    ) : (
      <p className="cp-empty">{pick(lang, { ko: "아직 등록된 내용이 없습니다.", en: "This page has no content yet." })}</p>
    );
  }

  if (checking) {
    return <p className="cp-empty">{pick(lang, { ko: "불러오는 중...", en: "Loading..." })}</p>;
  }

  return (
    <div className="cp-locked" role="status">
      <div className="cp-locked-icon" aria-hidden="true">🔒</div>
      <strong className="cp-locked-title">{pick(lang, { ko: "교인에게만 공개된 페이지입니다", en: "This page is for members only" })}</strong>
      <p className="cp-locked-desc">
        {pick(lang, {
          ko: "우리 교회 성도로 로그인하면 내용을 볼 수 있습니다.",
          en: "Log in as a member of this church to view the content.",
        })}
      </p>
      <Link href={loginHref} className="btn btn-primary">
        {pick(lang, { ko: "로그인하고 보기", en: "Log in to view" })}
      </Link>
    </div>
  );
}
