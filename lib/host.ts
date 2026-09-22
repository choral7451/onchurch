// 요청 호스트 판별용 순수 함수 모음. 서버(Proxy·RSC)와 브라우저 양쪽에서 쓰므로
// fetch·모듈 상태 같은 것을 두지 않는다.

// rewrite 뒤에는 앱에서 원래 요청 경로를 알 수 없다. Proxy 가 이 헤더로 넘겨준다.
export const ORIGINAL_PATH_HEADER = "x-onchurch-path";

// 온교회가 직접 서비스하는 호스트 — 교회 자체 도메인이 될 수 없는 주소들.
export const SERVICE_HOSTS = ["everychurch.co.kr", "onchurch.kr", "vercel.app", "localhost", "127.0.0.1"];

/** host 헤더("example.com:3000", "a.com, b.com" 형태 포함)에서 순수 호스트명만 뽑는다. */
export function normalizeHostname(host: string | null | undefined): string {
  return ((host ?? "").split(",")[0] ?? "").trim().split(":")[0]?.toLowerCase() ?? "";
}

/** 온교회가 직접 서비스하는 호스트(루트 도메인·서브도메인·프리뷰·로컬)인지 */
export function isServiceHost(hostname: string): boolean {
  if (!hostname) return true;
  return SERVICE_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
}

/**
 * 대표 호스트의 반대쪽(www ↔ apex). 서버의 counterpartHost 와 규칙이 같아야 한다.
 * 라벨 개수로 apex 를 판단하지 않는다 — 'a.co.kr' 같은 국내 apex 가 흔하다.
 */
export function counterpartHost(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : `www.${host}`;
}
