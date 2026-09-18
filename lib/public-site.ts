import { cache } from "react";
import { type Brand, type NavItem, CUSTOM_NAV_PREFIX } from "@/lib/types";
import { type Lang, pick, NAV_LABELS, FOOTER_HEADINGS } from "@/lib/i18n";
import type { HomeCustomLink } from "@/lib/quick-links";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

export type PublicChurch = {
  id: number;
  slug: string;
  name: string;
  eng: string | null;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  representative: string | null;
  businessNo: string | null;
  logoUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  naverVerification: string | null;
  liveUrl: string | null;
  isLive: boolean;
  liveStartedAt: string | null;
  enabledPages: string[];
  homeSectionOrder: string[];
  homeQuickLinks: string[];
  homeCustomLink: HomeCustomLink | null;
  siteLang: Lang;
  // 공개 홈페이지 템플릿 ID. 지원 목록·렌더 매핑은 components/templates/registry.tsx(레지스트리)가 관리.
  // 지정은 마스터 페이지의 교회 목록에서 변경. 미등록 값은 default 홈으로 폴백.
  siteTemplate: string;
  isPublished: boolean;
};

export type LiveStatus = { isLive: boolean; videoId: string | null };

export async function fetchLiveStatus(slug: string): Promise<LiveStatus> {
  try {
    const res = await fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/live-status`, {
      cache: "no-store",
    });
    if (!res.ok) return { isLive: false, videoId: null };
    const body = await res.json();
    return (body?.item ?? { isLive: false, videoId: null }) as LiveStatus;
  } catch {
    return { isLive: false, videoId: null };
  }
}

export const fetchPublicChurch = cache(async (slug: string): Promise<PublicChurch | null> => {
  try {
    const res = await fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.item ?? null) as PublicChurch | null;
  } catch {
    return null;
  }
});

export type PublicChurchSummary = {
  id: number;
  slug: string;
  name: string;
  eng: string | null;
  tagline: string | null;
  logoUrl: string | null;
};

export const fetchPublicChurchList = cache(async (): Promise<PublicChurchSummary[]> => {
  try {
    const res = await fetch(`${API_BASE}/onchurch/sites`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    const churches = body?.item?.churches;
    return Array.isArray(churches) ? (churches as PublicChurchSummary[]) : [];
  } catch {
    return [];
  }
});

export function brandFromChurch(church: PublicChurch): Brand {
  return {
    name: church.name ?? "",
    eng: church.eng ?? "",
    tagline: church.tagline ?? "",
    address: church.address ?? "",
    phone: church.phone ?? "",
    email: church.email ?? "",
    representative: church.representative ?? "",
    businessNo: church.businessNo ?? "",
    logoUrl: church.logoUrl ?? null,
  };
}

// 모든 사이트가 동일하게 노출하는 기본 네비. 페이지별 on/off 토글은 추후 구현.
export const PUBLIC_NAV: NavItem[] = [
  { id: "about", label: "교회 소개", href: "/about" },
  { id: "worship", label: "예배 안내", href: "/worship" },
  { id: "sermons", label: "말씀", href: "/sermons" },
  { id: "notices", label: "교회 소식", href: "/notices" },
  { id: "schedule", label: "일정", href: "/schedule" },
  { id: "gallery", label: "갤러리", href: "/gallery" },
  { id: "community", label: "교제", href: "/community" },
  { id: "directions", label: "찾아오시는 길", href: "/directions" },
];

export const PUBLIC_FOOTER_NAV: { heading: string; ids: string[] }[] = [
  { heading: "교회", ids: ["about", "worship", "directions"] },
  { heading: "콘텐츠", ids: ["sermons", "notices", "gallery", "community"] },
  { heading: "기타", ids: ["schedule"] },
];

// 언어에 맞춰 네비 라벨을 번역해 반환한다. href/id는 그대로.
export function getPublicNav(lang: Lang): NavItem[] {
  return PUBLIC_NAV.map((item) => ({
    ...item,
    label: NAV_LABELS[item.id] ? pick(lang, NAV_LABELS[item.id]) : item.label,
  }));
}

export function getPublicFooterNav(lang: Lang, customPageIds: string[] = []): { heading: string; ids: string[] }[] {
  return [
    { heading: pick(lang, FOOTER_HEADINGS.church), ids: ["about", "worship", "directions"] },
    { heading: pick(lang, FOOTER_HEADINGS.content), ids: ["sermons", "notices", "gallery", "community"] },
    { heading: pick(lang, FOOTER_HEADINGS.more), ids: ["schedule", ...customPageIds] },
  ];
}

export function customPageNavItems(pages: PublicCustomPage[]): NavItem[] {
  return pages.map((p) => ({ id: `${CUSTOM_NAV_PREFIX}${p.slug}`, label: p.title, href: `/p/${p.slug}` }));
}

// 커스텀 페이지를 '찾아오시는 길' 바로 앞에 끼워 넣는다. directions가 없으면 맨 뒤에 붙인다.
export function withCustomPages(nav: NavItem[], pages: PublicCustomPage[]): NavItem[] {
  const items = customPageNavItems(pages);
  if (items.length === 0) return nav;
  const at = nav.findIndex((n) => n.id === "directions");
  if (at < 0) return [...nav, ...items];
  return [...nav.slice(0, at), ...items, ...nav.slice(at)];
}

export type PublicCustomPage = {
  id: number;
  slug: string;
  title: string;
  blocks: unknown;
  sortOrder: number;
  isActive: boolean;
};

// 공개 사이트의 커스텀 페이지 목록. 네비·푸터 구성에 쓰이므로 요청당 한 번만 부르도록 cache로 감싼다.
export const fetchPublicCustomPages = cache(async (slug: string): Promise<PublicCustomPage[]> => {
  try {
    const res = await fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/custom-pages`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    const pages = body?.item?.pages;
    return Array.isArray(pages) ? (pages as PublicCustomPage[]) : [];
  } catch {
    return [];
  }
});

export const fetchPublicCustomPage = cache(async (slug: string, pageSlug: string): Promise<PublicCustomPage | null> => {
  try {
    const res = await fetch(
      `${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/custom-pages/${encodeURIComponent(pageSlug)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.item ?? null) as PublicCustomPage | null;
  } catch {
    return null;
  }
});
