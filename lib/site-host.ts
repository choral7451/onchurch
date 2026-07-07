const ROOT_DOMAINS = ["everychurch.co.kr", "onchurch.kr"];

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
  return "/admin";
}
