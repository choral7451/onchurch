import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UtilBar } from "@/components/shell/util-bar";
import { Nav } from "@/components/shell/nav";
import { Footer } from "@/components/shell/footer";
import { DemoCtaSticky } from "@/components/shell/demo-cta-sticky";
import { fetchPublicChurch, brandFromChurch, getPublicNav, getPublicFooterNav, fetchPublicCustomPages, withCustomPages, customPageNavItems } from "@/lib/public-site";
import { normalizeLang } from "@/lib/i18n";
import { getPathPrefix } from "@/lib/path-prefix";
import { resolveTemplateId } from "@/components/templates/meta";
import {
  fetchPublicPastor,
  buildChurchMetadata,
  buildChurchJsonLd,
  getSiteOrigin,
  getTenantPathPrefix,
} from "@/lib/seo";

type Params = { tenant: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "Not Found", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor);
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();

  const [pastor, origin, tenantPathPrefix, customPages] = await Promise.all([
    fetchPublicPastor(tenant),
    getSiteOrigin(),
    getTenantPathPrefix(tenant),
    fetchPublicCustomPages(tenant),
  ]);

  const brand = brandFromChurch(church);
  const pathPrefix = await getPathPrefix(tenant);
  const jsonLd = buildChurchJsonLd(church, pastor, origin, tenantPathPrefix);
  const lang = normalizeLang(church.siteLang);
  // 커스텀 페이지는 '찾아오시는 길' 앞에 들어간다. 비활성 페이지는 서버가 이미 걸러 보낸다.
  const nav = withCustomPages(getPublicNav(lang), customPages);
  const footerNav = getPublicFooterNav(lang, customPageNavItems(customPages).map((n) => n.id));

  return (
    <div className={`app ${resolveTemplateId(church.siteTemplate) === "modern" ? "tpl-modern" : ""}`} lang={lang}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <UtilBar tagline={brand.tagline} pathPrefix={pathPrefix} slug={tenant} lang={lang} />
      <Nav tenant={tenant} brand={brand} nav={nav} pathPrefix={pathPrefix} enabledPages={church.enabledPages} lang={lang} />
      <main>{children}</main>
      <Footer brand={brand} nav={nav} footerNav={footerNav} pathPrefix={pathPrefix} enabledPages={church.enabledPages} lang={lang} />
      <DemoCtaSticky />
    </div>
  );
}
