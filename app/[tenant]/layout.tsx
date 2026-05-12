import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UtilBar } from "@/components/shell/util-bar";
import { Nav } from "@/components/shell/nav";
import { Footer } from "@/components/shell/footer";
import { fetchPublicChurch, brandFromChurch, PUBLIC_NAV, PUBLIC_FOOTER_NAV } from "@/lib/public-site";
import { getPathPrefix } from "@/lib/path-prefix";

type Params = { tenant: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "Not Found" };
  const tagline = church.tagline ?? "";
  return {
    title: tagline ? `${church.name} — ${tagline}` : church.name,
    description: tagline || undefined,
  };
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

  const brand = brandFromChurch(church);
  const pathPrefix = await getPathPrefix(tenant);

  return (
    <div className="app">
      <UtilBar tagline={brand.tagline} />
      <Nav tenant={tenant} brand={brand} nav={PUBLIC_NAV} pathPrefix={pathPrefix} enabledPages={church.enabledPages} />
      <main>{children}</main>
      <Footer brand={brand} footerNav={PUBLIC_FOOTER_NAV} />
    </div>
  );
}
