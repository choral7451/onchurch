import type { SiteData } from "./types";
import { SITE_DATA as SUNGDONG } from "./site-data";

const TENANTS: Record<string, SiteData> = {
  sungdong: SUNGDONG,
};

export type TenantSlug = keyof typeof TENANTS;

export function getTenant(slug: string): SiteData | null {
  return TENANTS[slug] ?? null;
}

export function listTenants(): {
  slug: string;
  name: string;
  eng: string;
  tagline: string;
}[] {
  return Object.entries(TENANTS).map(([slug, data]) => ({
    slug,
    name: data.brand.name,
    eng: data.brand.eng,
    tagline: data.brand.tagline,
  }));
}

export const KNOWN_TENANT_SLUGS = Object.keys(TENANTS);
