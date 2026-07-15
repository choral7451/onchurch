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
};

export const SITE_TEMPLATE_META: SiteTemplateMeta[] = [
  { id: "default", label: "기본 (모던)", description: "온교회 기본 모던 홈. 섹션 순서·바로가기 커스터마이징 지원" },
  { id: "classic", label: "클래식 (전통형)", description: "충현교회 스타일 전통형 홈. 전체폭 히어로 슬라이더 + 설교/소식/갤러리 섹션" },
];
