import { NextResponse, type NextRequest } from "next/server";
import { KNOWN_TENANT_SLUGS } from "@/lib/tenants";

const RESERVED = new Set(["www", "app"]);

const ROOT_DOMAINS = [
  "everychurch.co.kr",
  "onchurch.kr",
];

function parseHost(host: string): { hostname: string; root: string | null; sub: string | null } {
  const hostname = host.split(":")[0] ?? "";
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

export function proxy(req: NextRequest) {
  const { root, sub } = parseHost(req.headers.get("host") ?? "");

  if (sub && !RESERVED.has(sub)) {
    const url = req.nextUrl.clone();
    if (!url.pathname.startsWith(`/${sub}`)) {
      url.pathname = `/${sub}${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
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
