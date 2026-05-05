import { NextResponse, type NextRequest } from "next/server";

const RESERVED = new Set(["www", "app"]);

function parseSubdomain(host: string): string | null {
  const hostname = host.split(":")[0];
  if (!hostname) return null;

  if (hostname === "localhost" || hostname === "127.0.0.1") return null;

  if (hostname.endsWith(".localhost")) {
    return hostname.slice(0, -".localhost".length) || null;
  }

  const parts = hostname.split(".");
  if (parts.length <= 2) return null;
  return parts[0];
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const sub = parseSubdomain(host);

  if (sub && !RESERVED.has(sub)) {
    const url = req.nextUrl.clone();
    if (!url.pathname.startsWith(`/${sub}`)) {
      url.pathname = `/${sub}${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
