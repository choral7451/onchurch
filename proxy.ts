import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { KNOWN_TENANT_SLUGS } from "@/lib/tenants";
import { matchCustomDomain } from "@/lib/custom-domains";
import { ORIGINAL_PATH_HEADER, normalizeHostname } from "@/lib/host";

const RESERVED = new Set(["www", "app"]);

const ROOT_DOMAINS = [
  "everychurch.co.kr",
  "onchurch.kr",
];

function parseHost(host: string): { hostname: string; root: string | null; sub: string | null } {
  const hostname = normalizeHostname(host);
  if (!hostname) return { hostname, root: null, sub: null };

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { hostname, root: null, sub: null };
  }

  if (hostname.endsWith(".localhost")) {
    return { hostname, root: "localhost", sub: hostname.slice(0, -".localhost".length) || null };
  }

  for (const root of ROOT_DOMAINS) {
    if (hostname === root) return { hostname, root, sub: null };
    if (hostname.endsWith(`.${root}`)) {
      return { hostname, root, sub: hostname.slice(0, -(`.${root}`.length)) };
    }
  }

  return { hostname, root: null, sub: null };
}

const KNOWN_SLUGS = new Set(KNOWN_TENANT_SLUGS);

// 교회 사이트 경로(/{slug}/...)로 rewrite 한다. 주소창은 그대로 유지된다.
function rewriteToTenant(req: NextRequest, slug: string) {
  const url = req.nextUrl.clone();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(ORIGINAL_PATH_HEADER, `${req.nextUrl.pathname}${req.nextUrl.search}`);

  // 경계까지 본다 — slug 가 'eun' 일 때 '/eunseok' 을 이미 rewrite 된 경로로 오인하면 안 된다.
  if (url.pathname === `/${slug}` || url.pathname.startsWith(`/${slug}/`)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  url.pathname = `/${slug}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export async function proxy(req: NextRequest, event: NextFetchEvent) {
  const host = req.headers.get("host") ?? "";

  // 교회가 연결한 자체 도메인 — 서브도메인과 똑같이 그 교회 사이트를 서빙한다.
  // 서비스 도메인(서브도메인·랜딩·프리뷰·로컬)이면 matchCustomDomain 이 조회 없이 null 을 준다.
  const custom = await matchCustomDomain(host, (p) => event.waitUntil(p));
  if (custom) {
    if (custom.isAlias) {
      // www ↔ non-www 는 대표 호스트 한쪽으로 모은다 — 같은 내용이 두 주소로 색인되지 않도록.
      return NextResponse.redirect(
        new URL(`https://${custom.primaryHost}${req.nextUrl.pathname}${req.nextUrl.search}`),
        308,
      );
    }
    return rewriteToTenant(req, custom.slug);
  }

  const { root, sub } = parseHost(host);

  // 자체 도메인이 연결된 교회의 서브도메인 접속은 app/[tenant]/layout.tsx 에서 대표 주소로 308 한다.
  // (여기서 처리하면 서브도메인 요청마다 매핑 조회가 생겨 Proxy 가 느려진다)
  if (sub && !RESERVED.has(sub)) {
    return rewriteToTenant(req, sub);
  }

  if (root && !sub) {
    const segments = req.nextUrl.pathname.split("/").filter(Boolean);
    const first = segments[0];
    if (first && KNOWN_SLUGS.has(first)) {
      const rest = segments.slice(1).join("/");
      const target = new URL(`https://${first}.${root}${rest ? `/${rest}` : ""}${req.nextUrl.search}`);
      return NextResponse.redirect(target, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  // naver\w+\.html: 네이버 서치어드바이저 소유확인 파일은 서브도메인에서도
  // tenant 경로로 rewrite되지 않고 public/ 정적 파일 그대로 서빙되어야 함
  matcher: ["/((?!_next/|api/|favicon.ico|robots.txt|sitemap.xml|feed.xml|naver\\w+\\.html).*)"],
};
