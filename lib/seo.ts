import { cache } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import type { PublicChurch } from "@/lib/public-site";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
export const ROOT_DOMAINS = ["everychurch.co.kr", "onchurch.kr"];

// 현재 요청 host 가 어떤 모드인지 판별
// - "subdomain": tenant.{root} 형태 → 서브도메인이 곧 한 교회 사이트
// - "root": ROOT_DOMAINS 자체 → 서비스 랜딩
// - "unknown": 그 외
export type HostKind = "subdomain" | "root" | "unknown";

export type ResolvedHost = {
  kind: HostKind;
  host: string;
  tenant: string | null;
};

export async function resolveHost(): Promise<ResolvedHost> {
  const h = await headers();
  const host = ((h.get("host") ?? "").split(",")[0] ?? "").split(":")[0]?.trim() ?? "";
  for (const root of ROOT_DOMAINS) {
    if (host === root) return { kind: "root", host, tenant: null };
    if (host.endsWith(`.${root}`)) {
      return { kind: "subdomain", host, tenant: host.slice(0, -1 * (root.length + 1)) };
    }
  }
  if (host === "localhost" || host === "127.0.0.1") return { kind: "root", host, tenant: null };
  if (host.endsWith(".localhost")) {
    return { kind: "subdomain", host, tenant: host.slice(0, -".localhost".length) };
  }
  return { kind: "unknown", host, tenant: null };
}

export type PublicPastor = {
  id: number;
  name: string;
  role: string | null;
  eng: string | null;
  message: string | null;
  longMessage: string | null;
  photoUrl: string | null;
};

export const fetchPublicPastor = cache(async (slug: string): Promise<PublicPastor | null> => {
  try {
    const res = await fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/about`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.item?.pastor ?? null) as PublicPastor | null;
  } catch {
    return null;
  }
});

// 현재 요청의 사이트 origin (`https://example.com`). 멀티테넌트라 host 헤더 기준.
export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = (h.get("host") ?? "").split(",")[0]?.trim() ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// 서브도메인 사이트면 ""(루트), path-prefix 사이트면 "/{tenant}"
export async function getTenantPathPrefix(tenant: string): Promise<string> {
  const h = await headers();
  const host = (h.get("host") ?? "").split(":")[0];
  const isSubdomain =
    ROOT_DOMAINS.some((r) => host.endsWith(`.${r}`)) || host.endsWith(".localhost");
  return isSubdomain ? "" : `/${tenant}`;
}

function compact(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function buildBaseDescription(church: PublicChurch, extras: string[] = []): string {
  const tagline = compact(church.tagline);
  const address = compact(church.address);
  const phone = compact(church.phone);
  const parts = [
    tagline,
    address && `${church.name}은(는) ${address}에 위치한 교회입니다.`,
    phone && `문의: ${phone}`,
    ...extras.map(compact).filter(Boolean),
  ].filter(Boolean);
  const joined = parts.join(" ");
  return joined.length > 160 ? `${joined.slice(0, 157)}...` : joined;
}

function buildKeywords(church: PublicChurch, extras: string[] = []): string[] {
  const addressTokens = compact(church.address)
    .split(/[\s,·]+/)
    .filter((s) => s.length >= 2)
    .slice(0, 4);
  const list = [
    church.name,
    church.eng,
    compact(church.tagline),
    "교회", "예배", "주일예배", "교회 홈페이지",
    ...addressTokens,
    addressTokens[0] ? `${addressTokens[0]} 교회` : null,
    ...extras,
  ].filter((s): s is string => !!s && s.trim().length > 0);
  return Array.from(new Set(list));
}

export type ChurchMetadataOptions = {
  pageTitle?: string;       // sub-page short title (예: "예배 안내")
  pageDescription?: string; // sub-page description override
  path?: string;            // canonical path (예: "/worship")
  extraKeywords?: string[];
};

export async function buildChurchMetadata(
  church: PublicChurch,
  pastor: PublicPastor | null,
  options: ChurchMetadataOptions = {},
): Promise<Metadata> {
  const origin = await getSiteOrigin();
  const pathPrefix = await getTenantPathPrefix(church.slug);
  const path = options.path ?? "";
  const url = `${origin}${pathPrefix}${path}`;

  const tagline = compact(church.tagline);
  const baseTitle = tagline ? `${church.name} — ${tagline}` : church.name;
  const fullTitle = options.pageTitle ? `${options.pageTitle} | ${church.name}` : baseTitle;

  const description = options.pageDescription
    ? compact(options.pageDescription)
    : buildBaseDescription(church, pastor?.name ? [`담임목사 ${pastor.name}`] : []);

  const keywords = buildKeywords(church, [
    ...(pastor?.name ? [pastor.name, `${pastor.name} 목사`] : []),
    ...(options.extraKeywords ?? []),
  ]);

  const logo = church.logoUrl ?? undefined;

  return {
    metadataBase: new URL(origin),
    title: {
      default: fullTitle,
      template: `%s | ${church.name}`,
    },
    description,
    keywords,
    applicationName: church.name,
    authors: church.representative ? [{ name: church.representative }] : undefined,
    alternates: { canonical: url },
    robots: church.isPublished
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: false },
    icons: logo ? { icon: logo, apple: logo, shortcut: logo } : undefined,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: church.name,
      title: fullTitle,
      description,
      url,
      images: logo ? [{ url: logo, alt: church.name }] : undefined,
    },
    twitter: {
      card: logo ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: logo ? [logo] : undefined,
    },
    other: church.address ? { "geo.placename": church.address } : undefined,
  };
}

export function buildChurchJsonLd(
  church: PublicChurch,
  pastor: PublicPastor | null,
  origin: string,
  pathPrefix: string,
): string {
  const url = `${origin}${pathPrefix}`;
  const sameAs: string[] = [];

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": `${url}#church`,
    name: church.name,
    alternateName: church.eng || undefined,
    description: compact(church.tagline) || undefined,
    url,
    image: church.logoUrl || undefined,
    logo: church.logoUrl || undefined,
    telephone: church.phone || undefined,
    email: church.email || undefined,
    address: church.address
      ? {
          "@type": "PostalAddress",
          streetAddress: church.address,
          addressCountry: "KR",
        }
      : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };

  if (pastor?.name) {
    node.employee = {
      "@type": "Person",
      name: pastor.name,
      jobTitle: pastor.role || "담임목사",
      alternateName: pastor.eng || undefined,
      image: pastor.photoUrl || undefined,
    };
  }

  return JSON.stringify(node);
}
