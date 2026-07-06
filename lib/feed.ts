import type { PublicChurch } from "@/lib/public-site";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

// RSS 한 항목. sermons/notices를 하나의 타임라인으로 합쳐 최신순 노출한다.
export type FeedItem = {
  guid: string;
  link: string;
  title: string;
  category: string;
  author: string | null;
  description: string; // 이미 HTML/텍스트. XML 출력 시 CDATA로 감싼다.
  pubDate: Date | null;
};

type ApiSermon = {
  id: number;
  seriesId: number | null;
  title: string;
  pastor: string | null;
  date: string | null;
  duration: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  summary: string | null;
};

type ApiSermonSeries = { id: number; name: string };

type ApiNotice = {
  id: number;
  category: string | null;
  title: string;
  content: string | null;
  imageUrls: string[];
  author: string | null;
  publishedAt: string | null;
  createdAt: string;
};

// "2026.03.22" / "2026-03-22" / ISO 문자열 모두 허용. 실패 시 null.
function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const norm = s.trim().replace(/\./g, "-").replace(/-+$/, "");
  const d = new Date(norm);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchSermonItems(slug: string, base: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/sermons`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    const series = (body?.item?.series ?? []) as ApiSermonSeries[];
    const sermons = (body?.item?.sermons ?? []) as ApiSermon[];
    const seriesById = new Map(series.map((s) => [s.id, s.name] as const));
    return sermons.map((s) => {
      const seriesName = s.seriesId != null ? seriesById.get(s.seriesId) ?? "말씀" : "말씀";
      const bits = [
        s.summary?.trim() || "",
        s.pastor ? `설교: ${s.pastor}` : "",
        s.duration ? `길이: ${s.duration}` : "",
        s.videoUrl ? `영상: ${s.videoUrl}` : "",
      ].filter(Boolean);
      return {
        guid: `${base}/sermons#sermon-${s.id}`,
        link: s.videoUrl || `${base}/sermons`,
        title: s.title,
        category: seriesName,
        author: s.pastor,
        description: bits.join("\n") || s.title,
        pubDate: parseDate(s.date),
      };
    });
  } catch {
    return [];
  }
}

async function fetchNoticeItems(slug: string, base: string): Promise<FeedItem[]> {
  try {
    // category 미지정 = 전체 카테고리 최신순. 최근 30건만 피드에 싣는다.
    const res = await fetch(
      `${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/notices?page=1&size=30`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const body = await res.json();
    const notices = (body?.item?.notices ?? []) as ApiNotice[];
    return notices.map((n) => ({
      guid: `${base}/notices#notice-${n.id}`,
      link: `${base}/notices`,
      title: n.title,
      category: n.category?.trim() || "교회 소식",
      author: n.author,
      description: (n.content?.trim() || n.title),
      pubDate: parseDate(n.publishedAt) ?? parseDate(n.createdAt),
    }));
  } catch {
    return [];
  }
}

// 발행된 교회 사이트의 설교 + 소식을 최신순으로 합친 피드 항목을 만든다.
// enabledPages 설정을 존중해 꺼진 섹션은 제외한다.
export async function buildTenantFeedItems(
  church: PublicChurch,
  base: string,
  limit = 40,
): Promise<FeedItem[]> {
  const enabled = new Set(church.enabledPages ?? []);
  const isEnabled = (id: string) => enabled.size === 0 || enabled.has(id);

  const tasks: Promise<FeedItem[]>[] = [];
  if (isEnabled("sermons")) tasks.push(fetchSermonItems(church.slug, base));
  if (isEnabled("notices")) tasks.push(fetchNoticeItems(church.slug, base));

  const groups = await Promise.all(tasks);
  const items = groups.flat();

  // pubDate 있는 항목 우선, 최신순. 날짜 없는 항목은 뒤로.
  items.sort((a, b) => {
    const ta = a.pubDate?.getTime() ?? -Infinity;
    const tb = b.pubDate?.getTime() ?? -Infinity;
    return tb - ta;
  });

  return items.slice(0, limit);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// CDATA 안전 처리: 본문 안의 "]]>" 시퀀스를 분리한다.
function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function toRfc822(d: Date | null): string {
  return (d ?? new Date()).toUTCString();
}

export type FeedChannel = {
  title: string;
  link: string;
  description: string;
  language?: string;
  imageUrl?: string | null;
  feedUrl: string;
};

// RSS 2.0 XML 문자열 생성. 네이버 서치어드바이저/구글 모두 표준 RSS 2.0을 인식한다.
export function renderRss(channel: FeedChannel, items: FeedItem[]): string {
  const lastBuild = items[0]?.pubDate ?? null;
  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
  parts.push("<channel>");
  parts.push(`<title>${escapeXml(channel.title)}</title>`);
  parts.push(`<link>${escapeXml(channel.link)}</link>`);
  parts.push(`<description>${escapeXml(channel.description)}</description>`);
  parts.push(`<language>${channel.language ?? "ko"}</language>`);
  parts.push(`<lastBuildDate>${toRfc822(lastBuild)}</lastBuildDate>`);
  parts.push(
    `<atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />`,
  );
  if (channel.imageUrl) {
    parts.push("<image>");
    parts.push(`<url>${escapeXml(channel.imageUrl)}</url>`);
    parts.push(`<title>${escapeXml(channel.title)}</title>`);
    parts.push(`<link>${escapeXml(channel.link)}</link>`);
    parts.push("</image>");
  }
  for (const it of items) {
    parts.push("<item>");
    parts.push(`<title>${escapeXml(it.title)}</title>`);
    parts.push(`<link>${escapeXml(it.link)}</link>`);
    parts.push(`<guid isPermaLink="false">${escapeXml(it.guid)}</guid>`);
    parts.push(`<category>${escapeXml(it.category)}</category>`);
    if (it.author) parts.push(`<author>${escapeXml(it.author)}</author>`);
    parts.push(`<pubDate>${toRfc822(it.pubDate)}</pubDate>`);
    parts.push(`<description>${cdata(it.description)}</description>`);
    parts.push("</item>");
  }
  parts.push("</channel>");
  parts.push("</rss>");
  return parts.join("\n");
}
