import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UtilBar } from "@/components/shell/util-bar";
import { Nav } from "@/components/shell/nav";
import { Footer } from "@/components/shell/footer";
import { getTenant, KNOWN_TENANT_SLUGS } from "@/lib/tenants";

type Params = { tenant: string };

export function generateStaticParams(): Params[] {
  return KNOWN_TENANT_SLUGS.map((tenant) => ({ tenant }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tenant } = await params;
  const data = getTenant(tenant);
  if (!data) return { title: "Not Found" };
  return {
    title: `${data.brand.name} — ${data.brand.tagline}`,
    description: data.brand.tagline,
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
  const data = getTenant(tenant);
  if (!data) notFound();

  return (
    <div className="app">
      <UtilBar tagline={data.brand.tagline} />
      <Nav tenant={tenant} brand={data.brand} nav={data.nav} />
      <main>{children}</main>
      <Footer brand={data.brand} footerNav={data.footerNav} />
    </div>
  );
}
