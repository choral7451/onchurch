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

type PublicBannerLite = {
  imageUrl: string | null;
  isDefault: boolean;
};

export const fetchPublicBanners = cache(async (slug: string): Promise<PublicBannerLite[]> => {
  try {
    const res = await fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/banners`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    return (body?.item?.banners ?? []) as PublicBannerLite[];
  } catch {
    return [];
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

// 네이버 권장 길이로 자르기 (글자 수 기준, 초과 시 … 부여)
function capLen(s: string, max: number): string {
  const arr = [...s];
  return arr.length <= max ? s : `${arr.slice(0, max - 1).join("").trimEnd()}…`;
}

// 주소에서 시·도 + 시·군·구까지만 추출 ("전라남도 여수시 충민로 179" → "전라남도 여수시")
function shortLocality(address: string | null | undefined): string {
  const tokens = compact(address).split(/\s+/).filter(Boolean);
  if (!tokens.length) return "";
  const out: string[] = [];
  for (const t of tokens) {
    out.push(t);
    if (/(시|군|구)$/.test(t)) return out.join(" ");
  }
  return tokens.slice(0, 2).join(" ");
}

// 네이버 권장: 설명문 80자 이내. 태그라인 + 교회명 + 지역으로 간결하게.
function buildBaseDescription(church: PublicChurch): string {
  const tagline = compact(church.tagline);
  const locality = shortLocality(church.address);
  const where = locality ? `${church.name}(${locality})` : church.name;
  const desc = tagline ? `${tagline} | ${where}` : `${where} 공식 홈페이지`;
  return capLen(desc, 80);
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
  // 네이버 권장: 제목 40자 이내. 초과 시 태그라인 생략하고 교회명만.
  const baseCandidate = tagline ? `${church.name} — ${tagline}` : church.name;
  const baseTitle = [...baseCandidate].length <= 40 ? baseCandidate : church.name;
  const fullTitle = options.pageTitle ? `${options.pageTitle} | ${church.name}` : baseTitle;

  const description = options.pageDescription
    ? capLen(compact(options.pageDescription), 80)
    : buildBaseDescription(church);

  const keywords = buildKeywords(church, [
    ...(pastor?.name ? [pastor.name, `${pastor.name} 목사`] : []),
    ...(options.extraKeywords ?? []),
  ]);

  const logo = church.logoUrl ?? undefined;

  // 공유(og:image)·favicon 이미지.
  // - favicon(icons): 교회 로고만 사용.
  // - 공유 이미지(og:image): 로고 → 첫 번째 배너 → 기본 배너 순으로 fallback.
  const banners = await fetchPublicBanners(church.slug);
  const firstBanner = banners.find((b) => !b.isDefault && b.imageUrl)?.imageUrl ?? undefined;
  const defaultBanner = banners.find((b) => b.isDefault && b.imageUrl)?.imageUrl ?? undefined;
  const shareImage = logo ?? firstBanner ?? defaultBanner;

  // <meta name="..."> 추가 항목. 교회별 네이버 사이트 인증 코드가 있으면 해당 교회 페이지에만 주입한다.
  const other: Record<string, string> = {};
  if (church.address) other["geo.placename"] = church.address;
  if (compact(church.naverVerification)) other["naver-site-verification"] = church.naverVerification!.trim();

  return {
    metadataBase: new URL(origin),
    // absolute: 루트 레이아웃의 "%s | 온교회" template을 무시하고 교회 제목만 노출
    title: {
      absolute: fullTitle,
      template: `%s | ${church.name}`,
    },
    description,
    keywords,
    applicationName: church.name,
    authors: church.representative ? [{ name: church.representative }] : undefined,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": `${origin}/feed.xml` },
    },
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
      images: shareImage ? [{ url: shareImage, alt: church.name }] : undefined,
    },
    twitter: {
      card: shareImage ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: shareImage ? [shareImage] : undefined,
    },
    other: Object.keys(other).length > 0 ? other : undefined,
  };
}

export function buildChurchJsonLd(
  church: PublicChurch,
  pastor: PublicPastor | null,
  origin: string,
  pathPrefix: string,
): string {
  const url = `${origin}${pathPrefix}`;
  // 교회의 공식 SNS를 sameAs로 연결 — 검색엔진이 동일 주체로 인식(신뢰도·지식패널 유리).
  const sameAs = [church.youtubeUrl, church.instagramUrl]
    .map((s) => compact(s))
    .filter((s) => /^https?:\/\//.test(s));

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
