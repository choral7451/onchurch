import type { MetadataRoute } from "next";
import { fetchPublicChurch } from "@/lib/public-site";
import { getSiteOrigin, getTenantPathPrefix, resolveHost } from "@/lib/seo";

type PageSpec = {
  id: string;
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
};

const TENANT_PAGES: PageSpec[] = [
  { id: "about",       path: "/about",       priority: 0.8, changeFrequency: "monthly" },
  { id: "worship",     path: "/worship",     priority: 0.9, changeFrequency: "monthly" },
  { id: "sermons",     path: "/sermons",     priority: 0.8, changeFrequency: "weekly" },
  { id: "notices",     path: "/notices",     priority: 0.7, changeFrequency: "weekly" },
  { id: "schedule",    path: "/schedule",    priority: 0.6, changeFrequency: "weekly" },
  { id: "gallery",     path: "/gallery",     priority: 0.6, changeFrequency: "monthly" },
  { id: "directions",  path: "/directions",  priority: 0.7, changeFrequency: "yearly" },
  { id: "bible",       path: "/bible",       priority: 0.4, changeFrequency: "monthly" },
  { id: "prayer",      path: "/prayer",      priority: 0.4, changeFrequency: "monthly" },
  { id: "departments", path: "/departments", priority: 0.5, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const resolved = await resolveHost();
  const origin = await getSiteOrigin();
  const now = new Date();

  // 서비스 랜딩 도메인 (onchurch.kr 자체): 랜딩 페이지만
  if (resolved.kind === "root") {
    return [
      { url: `${origin}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    ];
  }

  // 알 수 없는 호스트: 빈 sitemap
  if (resolved.kind !== "subdomain" || !resolved.tenant) return [];

  const church = await fetchPublicChurch(resolved.tenant);
  // 미공개 사이트는 색인 대상이 아님
  if (!church || !church.isPublished) return [];

  const prefix = await getTenantPathPrefix(resolved.tenant);
  const base = `${origin}${prefix}`;
  const enabled = new Set(church.enabledPages ?? []);
  const isEnabled = (id: string) => enabled.size === 0 || enabled.has(id);

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
  ];

  for (const page of TENANT_PAGES) {
    if (!isEnabled(page.id)) continue;
    entries.push({
      url: `${base}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  }

  return entries;
}
