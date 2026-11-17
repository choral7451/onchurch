import type React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { normalizeLang } from "@/lib/i18n";
import { fetchPublicChurch, fetchPublicCustomPage } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { normalizeBlocks, engFromSlug } from "@/lib/custom-page-blocks";
import { CustomPageBlocks } from "@/components/custom-page/blocks";
import { CustomPageMemberGate } from "@/components/custom-page/member-gate";
import { getPathPrefix } from "@/lib/path-prefix";

type Params = { params: Promise<{ tenant: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tenant, slug } = await params;
  const [church, page] = await Promise.all([fetchPublicChurch(tenant), fetchPublicCustomPage(tenant, slug)]);
  if (!church || !page) return { title: "페이지", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  // 한 줄 요약이 있으면 그것, 없으면 첫 본문 블록의 앞부분을 쓴다(둘 다 없으면 교회 기본 설명).
  const firstText = normalizeBlocks(page.blocks).find((b) => b.type === "text");
  const fromBody = firstText && firstText.type === "text" ? firstText.text.replace(/\s+/g, " ").trim().slice(0, 160) : undefined;
  const desc = page.summary?.trim() || fromBody;
  return buildChurchMetadata(church, pastor, {
    pageTitle: page.title,
    path: `/p/${page.slug}`,
    pageDescription: desc || undefined,
  });
}

export default async function CustomPage({ params }: Params) {
  const { tenant, slug } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();
  // 비활성 페이지는 서버가 내려주지 않으므로 여기서 곧바로 404가 된다.
  const page = await fetchPublicCustomPage(tenant, slug);
  if (!page) notFound();

  const lang = normalizeLang(church.siteLang);
  const blocks = normalizeBlocks(page.blocks);

  // 회원공개 페이지는 클라이언트 게이트가 본문을 맡는다 — 잠겨 있으면 로그인 안내, 로그인 상태면 재조회해 연다.
  let body: React.ReactNode;
  if (page.visibility === "member") {
    const prefix = await getPathPrefix(tenant);
    const loginHref = `${prefix}/login?next=${encodeURIComponent(`/p/${page.slug}`)}`;
    body = (
      <CustomPageMemberGate
        slug={tenant}
        pageSlug={page.slug}
        lang={lang}
        loginHref={loginHref}
        initialLocked={page.locked}
        initialBlocks={blocks}
      />
    );
  } else if (blocks.length > 0) {
    body = <CustomPageBlocks blocks={blocks} />;
  } else {
    body = <p className="cp-empty">{lang === "en" ? "This page has no content yet." : "아직 등록된 내용이 없습니다."}</p>;
  }

  return (
    <div>
      <PageHeader eyebrow={engFromSlug(page.slug)} title={page.title} sub={page.summary?.trim() || undefined} />
      <section className="section">
        <div className="container">{body}</div>
      </section>
    </div>
  );
}
