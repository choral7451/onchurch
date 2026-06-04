const ROOT_DOMAINS = ["everychurch.co.kr", "onchurch.kr"];

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
