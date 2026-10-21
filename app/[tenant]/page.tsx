import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { getPathPrefix } from "@/lib/path-prefix";
import { normalizeLang } from "@/lib/i18n";
import { resolveTemplateHome } from "@/components/templates/registry";
import { DefaultHome } from "@/components/templates/default/home";
import { MixedHome } from "@/components/templates/mixed-home";
import { SiteColorStyle } from "@/components/site-color-style";
import { decodeDesignPreview, normalizeSiteDesign } from "@/lib/site-design";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: SearchParams }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "Not Found", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  const meta = buildChurchMetadata(church, pastor, { path: "" });
  // 관리자 디자인 미리보기(?design=)는 저장 전 초안이므로 색인하지 않는다.
  if ((await searchParams).design) return { ...meta, robots: { index: false, follow: false } };
  return meta;
}

export default async function TenantHome({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: SearchParams }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();

  const lang = normalizeLang(church.siteLang);
  const pathPrefix = await getPathPrefix(tenant);

  // 관리자 '디자인' 화면의 미리보기: 저장 전 초안을 쿼리로 받아 그 설정으로 렌더한다(저장하지 않음).
  const preview = decodeDesignPreview((await searchParams).design);
  const siteDesign = preview ? preview.design : normalizeSiteDesign(church.siteDesign);

  // 디자인 설정(섹션별 기본/모던·색)이 있는 교회만 섞어 그린다. 미설정 교회는 아래 기존 경로 그대로(영향 없음).
  if (siteDesign || preview) {
    return (
      <>
        {preview && <SiteColorStyle colors={siteDesign?.colors} />}
        <MixedHome church={church} tenant={tenant} lang={lang} pathPrefix={pathPrefix} design={siteDesign} order={preview?.order ?? church.homeSectionOrder} />
      </>
    );
  }

  // 레지스트리에 등록된 템플릿이면 해당 홈으로 렌더. 미지정/미등록 값은 기본(default) 홈으로 폴백.
  const TemplateHome = resolveTemplateHome(church.siteTemplate);
  if (TemplateHome) {
    return <TemplateHome church={church} tenant={tenant} lang={lang} pathPrefix={pathPrefix} />;
  }
  return <DefaultHome church={church} tenant={tenant} lang={lang} pathPrefix={pathPrefix} />;
}
