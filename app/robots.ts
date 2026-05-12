import type { MetadataRoute } from "next";
import { fetchPublicChurch } from "@/lib/public-site";
import { getSiteOrigin, resolveHost } from "@/lib/seo";

const DISALLOWED_PATHS = ["/admin", "/login", "/signup", "/api/"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const resolved = await resolveHost();
  const origin = await getSiteOrigin();
  const sitemapUrl = `${origin}/sitemap.xml`;

  // 서비스 랜딩 도메인: 마케팅 페이지는 색인 허용, 인증/관리 영역만 차단
  if (resolved.kind === "root") {
    return {
      rules: [{ userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS }],
      sitemap: sitemapUrl,
      host: origin,
    };
  }

  // 알 수 없는 호스트: 전체 차단
  if (resolved.kind !== "subdomain" || !resolved.tenant) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const church = await fetchPublicChurch(resolved.tenant);
  if (!church || !church.isPublished) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS }],
    sitemap: sitemapUrl,
    host: origin,
  };
}
