// 빌드 시점에 교회 자체 도메인 매핑을 받아 lib/custom-domains.generated.ts 로 굽는다.
//
// 왜 굽는가: 이 매핑은 Proxy(미들웨어)에서 쓰이는데, 콜드 isolate 가 매 번 네트워크로 받아오면
// 조회가 한 번만 실패해도 그 교회 홈페이지가 랜딩 페이지로 보이고 robots 가 전체 차단된다.
// 스냅샷이 번들에 들어 있으면 네트워크 없이도 즉시 올바르게 라우팅된다.
// DB 는 여전히 단일 소스다 — 런타임에 갱신해서 배포 이후 추가된 도메인도 반영한다.
//
// 조회 실패 시 기존 파일을 덮지 않는다 (빈 스냅샷으로 덮으면 운영 중인 도메인이 죽는다).

import { writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
const OUT = fileURLToPath(new URL("../lib/custom-domains.generated.ts", import.meta.url));

function render(domains) {
  const rows = domains.map((d) => `  { host: ${JSON.stringify(d.host)}, slug: ${JSON.stringify(d.slug)} },`).join("\n");
  return `// 자동 생성 파일 — 직접 수정하지 마세요. scripts/generate-custom-domains.mjs 가 빌드 시점에 씁니다.
// 교회 자체 도메인 매핑의 빌드 시점 스냅샷. 런타임에 API 로 갱신되지만,
// 콜드 isolate 가 네트워크 없이도 바로 라우팅할 수 있도록 번들에 포함한다.

export type CustomDomainSnapshotRow = { host: string; slug: string };

export const CUSTOM_DOMAIN_SNAPSHOT: CustomDomainSnapshotRow[] = [
${rows}
];
`;
}

async function main() {
  try {
    const res = await fetch(`${API_BASE}/onchurch/sites/domains`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const domains = (body?.item?.domains ?? [])
      .map((d) => ({ host: String(d.host ?? "").trim().toLowerCase(), slug: String(d.slug ?? "") }))
      .filter((d) => d.host && d.slug)
      .sort((a, b) => a.host.localeCompare(b.host));
    writeFileSync(OUT, render(domains));
    console.log(`[custom-domains] 스냅샷 ${domains.length}건 생성`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (existsSync(OUT)) {
      console.warn(`[custom-domains] 조회 실패(${msg}) — 기존 스냅샷 유지`);
      return;
    }
    console.warn(`[custom-domains] 조회 실패(${msg}) — 빈 스냅샷 생성`);
    writeFileSync(OUT, render([]));
  }
}

await main();
