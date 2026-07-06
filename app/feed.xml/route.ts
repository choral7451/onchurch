import { fetchPublicChurch, fetchPublicChurchList } from "@/lib/public-site";
import { getSiteOrigin, getTenantPathPrefix, resolveHost } from "@/lib/seo";
import { buildTenantFeedItems, renderRss, type FeedItem } from "@/lib/feed";

// 멀티테넌트 · host 기반이라 요청마다 새로 생성. (백엔드 fetch도 no-store)
export const dynamic = "force-dynamic";

function xml(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // CDN/브라우저 캐시: 10분 신선, 이후 1시간 stale 허용
      "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}

export async function GET(): Promise<Response> {
  const resolved = await resolveHost();
  const origin = await getSiteOrigin();
  const feedUrl = `${origin}/feed.xml`;

  // 서비스 랜딩 도메인: 공개된 교회 사이트 목록을 하나의 피드로 제공
  if (resolved.kind === "root") {
    const churches = await fetchPublicChurchList();
    const items: FeedItem[] = churches.map((c) => {
      const churchUrl = origin.replace("://", `://${c.slug}.`);
      return {
        guid: `${churchUrl}/`,
        link: `${churchUrl}/`,
        title: c.name,
        category: "교회",
        author: null,
        description: c.tagline?.trim() || `${c.name} 공식 홈페이지`,
        pubDate: null,
      };
    });
    return xml(
      renderRss(
        {
          title: "온교회 — 새로 오픈한 교회 홈페이지",
          link: `${origin}/`,
          description: "온교회로 개설된 교회 홈페이지 모음",
          imageUrl: null,
          feedUrl,
        },
        items,
      ),
    );
  }

  // 알 수 없는 호스트 / 미공개 사이트: 빈 피드 (404 대신 유효한 빈 RSS)
  if (resolved.kind !== "subdomain" || !resolved.tenant) {
    return xml(
      renderRss({ title: "온교회", link: `${origin}/`, description: "온교회", feedUrl }, []),
      404,
    );
  }

  const church = await fetchPublicChurch(resolved.tenant);
  if (!church || !church.isPublished) {
    return xml(
      renderRss({ title: "온교회", link: `${origin}/`, description: "온교회", feedUrl }, []),
      404,
    );
  }

  const prefix = await getTenantPathPrefix(resolved.tenant);
  const base = `${origin}${prefix}`;
  const items = await buildTenantFeedItems(church, base);

  const description =
    church.tagline?.trim() || `${church.name}의 최신 설교와 교회 소식`;

  return xml(
    renderRss(
      {
        title: `${church.name} — 설교 · 교회 소식`,
        link: `${base}/`,
        description,
        imageUrl: church.logoUrl,
        feedUrl,
      },
      items,
    ),
  );
}
