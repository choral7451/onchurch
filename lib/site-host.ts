import { isServiceHost } from "@/lib/host";

const ROOT_DOMAINS = ["everychurch.co.kr", "onchurch.kr"];

// 교회 홈페이지의 운영 대표 호스트. 자체 도메인이 연결돼 있으면 그 주소, 아니면 서브도메인.
// QR·주보처럼 인쇄물에 들어가는 주소라 현재 접속 호스트(localhost·프리뷰)와 무관하게 항상 운영 주소를 돌려준다.
// 서브도메인 접속은 자체 도메인으로 308 되므로 둘 다 유효하지만, 인쇄물에는 교회가 산 도메인이 보이는 게 맞다.
export function churchPublicHost(slug: string, customDomain?: string | null): string {
  const custom = (customDomain ?? "").trim();
  return custom || `${slug}.${ROOT_DOMAINS[0]}`;
}

export function churchPublicUrl(slug: string, customDomain?: string | null): string {
  return `https://${churchPublicHost(slug, customDomain)}`;
}

// 교회 홈페이지(서브도메인) URL을 만든다. 개발(localhost 포함)에서도 서브도메인으로 접근한다.
// 매칭되는 루트가 없으면 path(/slug)로 폴백.
const SITE_ROOTS = ["everychurch.co.kr", "onchurch.kr", "localhost"];
export function buildChurchSiteUrl(slug: string): string {
  if (typeof window === "undefined") return `/${slug}`;
  const { protocol, host } = window.location;
  const [hostname, port] = host.split(":");
  const portSuffix = port ? `:${port}` : "";
  for (const root of SITE_ROOTS) {
    if (hostname === root || hostname.endsWith(`.${root}`)) {
      return `${protocol}//${slug}.${root}${portSuffix}`;
    }
  }
  return `/${slug}`;
}

// 현재 호스트(서브도메인)에서 루트 도메인의 관리자 콘솔(/admin) URL을 만든다.
export function buildAdminUrl(): string {
  if (typeof window === "undefined") return "/admin";
  const { protocol, host } = window.location;
  const [hostname, port] = host.split(":");
  const portSuffix = port ? `:${port}` : "";
  for (const root of ROOT_DOMAINS) {
    if (hostname === root) return "/admin";
    if (hostname.endsWith(`.${root}`)) return `${protocol}//${root}${portSuffix}/admin`;
  }
  if (hostname.endsWith(".localhost")) return `${protocol}//localhost${portSuffix}/admin`;
  // 교회 자체 도메인에는 관리자 콘솔이 없다(Proxy 가 /{slug} 로 rewrite 해서 404). 루트 도메인으로 보낸다.
  if (!isServiceHost(hostname ?? "")) return `https://${ROOT_DOMAINS[0]}/admin`;
  return "/admin";
}
