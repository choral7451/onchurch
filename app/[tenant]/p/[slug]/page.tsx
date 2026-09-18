import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { normalizeLang } from "@/lib/i18n";
import { fetchPublicChurch, fetchPublicCustomPage } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { normalizeBlocks } from "@/lib/custom-page-blocks";
import { CustomPageBlocks } from "@/components/custom-page/blocks";

type Params = { params: Promise<{ tenant: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tenant, slug } = await params;
  const [church, page] = await Promise.all([fetchPublicChurch(tenant), fetchPublicCustomPage(tenant, slug)]);
  if (!church || !page) return { title: "페이지", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  // 첫 본문 블록의 앞부분을 설명으로 쓴다(없으면 교회 기본 설명으로 폴백).
  const firstText = normalizeBlocks(page.blocks).find((b) => b.type === "text");
  const desc = firstText && firstText.type === "text" ? firstText.text.replace(/\s+/g, " ").trim().slice(0, 160) : undefined;
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

  return (
    <div>
      <PageHeader eyebrow="PAGE" title={page.title} />
      <section className="section">
        <div className="container">
          {blocks.length > 0 ? (
            <CustomPageBlocks blocks={blocks} />
          ) : (
            <p className="cp-empty">{lang === "en" ? "This page has no content yet." : "아직 등록된 내용이 없습니다."}</p>
          )}
        </div>
      </section>
    </div>
  );
}
