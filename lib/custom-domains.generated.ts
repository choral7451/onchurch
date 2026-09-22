// 자동 생성 파일 — 직접 수정하지 마세요. scripts/generate-custom-domains.mjs 가 빌드 시점에 씁니다.
// 교회 자체 도메인 매핑의 빌드 시점 스냅샷. 런타임에 API 로 갱신되지만,
// 콜드 isolate 가 네트워크 없이도 바로 라우팅할 수 있도록 번들에 포함한다.

export type CustomDomainSnapshotRow = { host: string; slug: string };

export const CUSTOM_DOMAIN_SNAPSHOT: CustomDomainSnapshotRow[] = [
  { host: "www.trendnews.co.kr", slug: "onchurch" },
];
