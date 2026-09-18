// 공개 홈페이지 템플릿 메타데이터 (클라이언트 컴포넌트에서도 안전하게 임포트 가능 — 컴포넌트 참조 없음).
// 마스터 화면의 템플릿 선택 드롭다운 등 "목록"이 필요한 곳은 이 파일만 사용한다.
//
// ── 새 템플릿 추가 방법 ──────────────────────────────────────
// 1. components/templates/<id>/ 폴더를 만들고 Home 컴포넌트 작성 (props: TemplateHomeProps)
// 2. 이 파일의 SITE_TEMPLATE_META에 항목 1줄 추가
// 3. registry.tsx의 TEMPLATE_HOMES에 매핑 1줄 추가
// → 서버(artinfo-server)는 템플릿 ID를 그대로 저장·전달만 하므로 수정할 필요 없음.
// ─────────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATE_ID = "default";

export type SiteTemplateMeta = {
  id: string;
  label: string;
  description: string;
  // 선택 화면에 색 견본으로 찍히는 대표색. main=홈 전반의 기본색, point=버튼·강조에 쓰는 포인트색.
  colors: { main: string; point: string };
};

export const SITE_TEMPLATE_META: SiteTemplateMeta[] = [
  {
    id: "default",
    label: "기본",
    description: "밝은 화이트 배경에 여백이 넉넉한 단정한 스타일",
    // app/globals.css :root의 --primary / --accent
    colors: { main: "oklch(0.32 0.08 250)", point: "oklch(0.62 0.14 245)" },
  },
  {
    id: "modern",
    label: "모던",
    description: "슬레이트 네이비 톤에 둥근 카드가 얹힌 감각적인 스타일",
    // app/globals.css .chc-root의 --chc-navy / --chc-primary
    colors: { main: "#14283d", point: "#2f5480" },
  },
];

// 구 템플릿 ID → 현재 ID. DB에 남아 있는 예전 값을 '읽는 시점'에 흡수하므로,
// 데이터 마이그레이션 전후 어느 쪽이든 같은 템플릿이 렌더된다.
// (classic은 2026-09-18 modern으로 개명 — 디자인이 전통형에서 카드형으로 개편되면서 이름이 실제와 어긋났다.)
const LEGACY_TEMPLATE_IDS: Record<string, string> = { classic: "modern" };

export function resolveTemplateId(siteTemplate?: string | null): string {
  const id = siteTemplate?.trim() || DEFAULT_TEMPLATE_ID;
  return LEGACY_TEMPLATE_IDS[id] ?? id;
}
