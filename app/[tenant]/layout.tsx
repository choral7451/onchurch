import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UtilBar } from "@/components/shell/util-bar";
import { Nav } from "@/components/shell/nav";
import { Footer } from "@/components/shell/footer";
import { fetchPublicChurch, brandFromChurch, PUBLIC_NAV, PUBLIC_FOOTER_NAV } from "@/lib/public-site";
import { getPathPrefix } from "@/lib/path-prefix";
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

  const [pastor, origin, tenantPathPrefix] = await Promise.all([
    fetchPublicPastor(tenant),
    getSiteOrigin(),
    getTenantPathPrefix(tenant),
  ]);

  const brand = brandFromChurch(church);
  const pathPrefix = await getPathPrefix(tenant);
  const jsonLd = buildChurchJsonLd(church, pastor, origin, tenantPathPrefix);

  return (
    <div className="app">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <UtilBar tagline={brand.tagline} />
      <Nav tenant={tenant} brand={brand} nav={PUBLIC_NAV} pathPrefix={pathPrefix} enabledPages={church.enabledPages} />
      <main>{children}</main>
      <Footer brand={brand} nav={PUBLIC_NAV} footerNav={PUBLIC_FOOTER_NAV} pathPrefix={pathPrefix} enabledPages={church.enabledPages} />
    </div>
  );
}
