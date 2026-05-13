import { cache } from "react";
import type { Brand, NavItem } from "@/lib/types";

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
  enabledPages: string[];
  isPublished: boolean;
};

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
  { id: "sermons", label: "말씀과 주보", href: "/sermons" },
  { id: "notices", label: "교회 소식", href: "/notices" },
  { id: "schedule", label: "일정", href: "/schedule" },
  { id: "gallery", label: "갤러리", href: "/gallery" },
  { id: "directions", label: "찾아오시는 길", href: "/directions" },
];

export const PUBLIC_FOOTER_NAV: { heading: string; ids: string[] }[] = [
  { heading: "교회", ids: ["about", "worship", "directions"] },
  { heading: "콘텐츠", ids: ["sermons", "notices", "gallery"] },
  { heading: "기타", ids: ["schedule"] },
];
