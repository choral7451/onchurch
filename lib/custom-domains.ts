// 교회가 직접 보유한 도메인 → 교회 slug 매핑.
//
// DB(onchurch_churches.custom_domain)가 단일 소스이고, 서버가 GET /onchurch/sites/domains 로 전체를 준다.
// 이 매핑만으로는 접속되지 않는다 — Vercel 프로젝트 Domains 등록 + 교회 DNS 변경이 함께 끝나야 한다.
//
// Proxy(미들웨어)에서 쓰기 때문에 지켜야 하는 제약이 있다.
//   - Proxy 에서는 fetch 의 cache/next.revalidate 옵션이 무효다 → TTL 캐시를 직접 들고 있는다.
//   - Proxy 는 CDN 에 배포될 수 있어 모듈 전역이 유지된다고 가정하면 안 된다.
//   - Proxy 는 느린 데이터 조회에 쓰면 안 된다.
//
// 그래서 조회 결과에 의존하지 않는 구조로 둔다.
//   1. 빌드 시점 스냅샷(custom-domains.generated.ts)을 번들에 넣어 콜드 isolate 도 네트워크 없이 라우팅한다.
//   2. 이미 아는 호스트는 기다리지 않고 바로 응답하고, 갱신은 뒤에서 한다.
//   3. 조회에 실패해도 '빈 매핑'을 정답처럼 쓰지 않는다 — 갖고 있는 매핑을 유지한다.
//      (실패를 정답으로 쓰면 교회 홈페이지가 랜딩 페이지로 바뀌고 robots 가 전체 차단된다)

import { CUSTOM_DOMAIN_SNAPSHOT } from "@/lib/custom-domains.generated";
import { counterpartHost, isServiceHost, normalizeHostname } from "@/lib/host";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

const TTL_MS = 5 * 60 * 1000;
// 조회 실패 후 재시도까지의 간격. 이 동안에도 매핑은 '갖고 있는 값'을 계속 쓴다.
const RETRY_MS = 10 * 1000;
const TIMEOUT_MS = 3000;
const FETCH_ATTEMPTS = 2;

export type CustomDomainEntry = {
  // 교회 slug
  slug: string;
  // 대표 호스트 (canonical). 요청이 www 짝으로 들어왔으면 이 주소로 308 한다.
  primaryHost: string;
  // 요청 호스트가 대표 호스트가 아니라 www 짝이었는지
  isAlias: boolean;
};

type DomainIndex = Map<string, CustomDomainEntry>;

function buildIndex(mappings: { host: string; slug: string }[]): DomainIndex {
  const index: DomainIndex = new Map();
  for (const { host, slug } of mappings) {
    const primaryHost = normalizeHostname(host);
    if (!primaryHost || !slug) continue;
    index.set(primaryHost, { slug, primaryHost, isAlias: false });
  }
  // www 짝은 대표 호스트를 덮어쓰지 않는다 (두 교회가 서로의 짝을 쓰는 경우 대비).
  for (const { host, slug } of mappings) {
    const primaryHost = normalizeHostname(host);
    if (!primaryHost || !slug) continue;
    const alias = counterpartHost(primaryHost);
    if (!index.has(alias)) index.set(alias, { slug, primaryHost, isAlias: true });
  }
  return index;
}

// 빌드 시점 스냅샷으로 시작한다. null 이 되는 순간이 없어야 한다.
let cachedIndex: DomainIndex = buildIndex(CUSTOM_DOMAIN_SNAPSHOT);
// 스냅샷은 '오래된 값'으로 본다 → 첫 요청 때 갱신을 건다.
let cachedAt = 0;
let nextAttemptAt = 0;
let inflight: Promise<DomainIndex> | null = null;

async function fetchIndex(): Promise<DomainIndex> {
  let lastError: unknown;
  // 한 번의 블립으로 매핑이 통째로 비어 보이지 않도록 짧게 재시도한다.
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(`${API_BASE}/onchurch/sites/domains`, {
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`domains ${res.status}`);
      const body = await res.json();
      const domains = body?.item?.domains;
      if (!Array.isArray(domains)) throw new Error("domains payload");
      return buildIndex(domains);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("domains fetch failed");
}

function refresh(): Promise<DomainIndex> {
  inflight ??= fetchIndex()
    .then((index) => {
      cachedIndex = index;
      cachedAt = Date.now();
      nextAttemptAt = 0;
      return index;
    })
    .catch(() => {
      // 갖고 있는 매핑을 그대로 유지한다 — 실패를 '연결된 도메인 없음'으로 해석하지 않는다.
      nextAttemptAt = Date.now() + RETRY_MS;
      return cachedIndex;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function isStale(): boolean {
  const now = Date.now();
  return now - cachedAt >= TTL_MS && now >= nextAttemptAt;
}

/**
 * 요청 호스트에 연결된 교회. 자체 도메인이 아니면 null.
 *
 * 이미 아는 호스트는 네트워크를 기다리지 않는다 — 배포 이후 추가된 도메인(스냅샷에 없는 호스트)일 때만
 * 조회를 기다린다. waitUntil 을 주면 갱신을 응답 이후로 미룬다.
 */
export async function matchCustomDomain(
  host: string | null | undefined,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<CustomDomainEntry | null> {
  const hostname = normalizeHostname(host);
  if (!hostname || isServiceHost(hostname)) return null;

  const known = cachedIndex.get(hostname);
  if (known) {
    if (isStale()) {
      const p = refresh();
      if (waitUntil) waitUntil(p);
    }
    return known;
  }

  // 모르는 호스트 — 새로 연결한 도메인일 수 있으므로 이때만 기다린다.
  if (!isStale()) return null;
  const index = await refresh();
  return index.get(hostname) ?? null;
}
