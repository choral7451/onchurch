// 교회가 직접 보유한 도메인 → 교회 slug 매핑.
//
// 매핑은 DB(onchurch_churches.custom_domain)가 단일 소스이고, 서버가 전체 목록을
// GET /onchurch/sites/domains 로 내려준다. 마스터 화면에서 도메인을 바꾸면 최대 TTL 만큼 뒤에 반영된다.
//
// 이 매핑만으로는 접속되지 않는다 — Vercel 프로젝트 Domains 에 대표 호스트와 www 짝을 등록하고
// (자동 SSL) 교회 DNS 를 Vercel 로 바꾸는 작업이 함께 끝나야 한다.
//
// Proxy(미들웨어)에서도 쓰기 때문에 지켜야 하는 제약이 있다.
//   - Proxy 에서는 fetch 의 cache/next.revalidate 옵션이 무효다 → TTL 캐시를 직접 들고 있는다.
//   - Proxy 는 CDN 에 배포될 수 있어 모듈 전역이 유지된다고 가정하면 안 된다
//     → 캐시는 '있으면 빠른' 최적화일 뿐, 없어도 동작이 같아야 한다.
//   - Proxy 는 느린 데이터 조회에 쓰면 안 된다
//     → 서비스 도메인(서브도메인·랜딩·프리뷰)은 조회 없이 빠져나가고, 정체불명 호스트일 때만 조회한다.

import { counterpartHost, isServiceHost, normalizeHostname } from "@/lib/host";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

const TTL_MS = 5 * 60 * 1000;
// 조회 실패 시 매 요청마다 재시도하지 않도록 두는 간격.
const RETRY_MS = 30 * 1000;
// Proxy 가 이 시간 이상 막히지 않게 한다.
const TIMEOUT_MS = 2000;

export type CustomDomainEntry = {
  // 교회 slug
  slug: string;
  // 대표 호스트 (canonical). 요청이 www 짝으로 들어왔으면 이 주소로 308 한다.
  primaryHost: string;
  // 요청 호스트가 대표 호스트가 아니라 www 짝이었는지
  isAlias: boolean;
};

type DomainIndex = Map<string, CustomDomainEntry>;

let cachedIndex: DomainIndex | null = null;
let cachedAt = 0;
let nextAttemptAt = 0;
let inflight: Promise<DomainIndex> | null = null;
// 진단용 — Proxy 안에서 매핑 조회가 왜 비었는지 밖에서 볼 방법이 없어 임시로 노출한다.
let lastError: string | null = null;
let loadCount = 0;

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

async function fetchIndex(): Promise<DomainIndex> {
  const res = await fetch(`${API_BASE}/onchurch/sites/domains`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`domains ${res.status}`);
  const body = await res.json();
  const domains = body?.item?.domains;
  return buildIndex(Array.isArray(domains) ? domains : []);
}

async function getIndex(): Promise<DomainIndex> {
  const now = Date.now();
  if (cachedIndex && now - cachedAt < TTL_MS) return cachedIndex;
  // 직전 조회가 실패했으면 잠시 이전 값(없으면 빈 매핑)으로 버틴다.
  if (!cachedIndex && now < nextAttemptAt) return new Map();
  if (cachedIndex && now < nextAttemptAt) return cachedIndex;

  inflight ??= fetchIndex()
    .then((index) => {
      cachedIndex = index;
      cachedAt = Date.now();
      nextAttemptAt = 0;
      lastError = null;
      loadCount += 1;
      return index;
    })
    .catch((e) => {
      lastError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      // 서버 장애로 교회 홈페이지가 랜딩 페이지로 바뀌면 안 되므로 이전 매핑을 그대로 쓴다.
      nextAttemptAt = Date.now() + RETRY_MS;
      return cachedIndex ?? new Map();
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/**
 * 요청 호스트에 연결된 교회. 자체 도메인이 아니면 null.
 * 서비스 도메인은 조회 없이 즉시 null 이라 Proxy 의 일반 경로에는 비용이 없다.
 */
export async function matchCustomDomain(host: string | null | undefined): Promise<CustomDomainEntry | null> {
  const hostname = normalizeHostname(host);
  if (!hostname || isServiceHost(hostname)) return null;
  const index = await getIndex();
  return index.get(hostname) ?? null;
}

/** 진단용 — 매핑 캐시 상태. 임시 조사용이며 정리 대상. */
export function domainIndexStatus(): string {
  return JSON.stringify({
    size: cachedIndex ? cachedIndex.size : -1,
    age: cachedIndex ? Date.now() - cachedAt : -1,
    loads: loadCount,
    err: lastError,
    base: API_BASE,
  });
}
