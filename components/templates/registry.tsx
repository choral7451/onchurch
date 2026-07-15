import type { ComponentType } from "react";
import type { PublicChurch } from "@/lib/public-site";
import type { Lang } from "@/lib/i18n";
import { ClassicHome } from "@/components/templates/classic/home";

// 공개 홈페이지 템플릿 레지스트리 (서버 컴포넌트 전용 — 템플릿 컴포넌트를 직접 참조).
// 템플릿 목록/라벨 등 메타데이터는 meta.ts 참고. 새 템플릿 추가 방법도 meta.ts 상단에 정리되어 있다.

// 모든 템플릿 Home 컴포넌트가 받는 공통 props 규격.
export type TemplateHomeProps = {
  church: PublicChurch;
  tenant: string;
  lang: Lang;
  pathPrefix: string;
};

// 'default'는 app/[tenant]/page.tsx의 기본 홈이 담당하므로 여기 등록하지 않는다.
const TEMPLATE_HOMES: Record<string, ComponentType<TemplateHomeProps>> = {
  classic: ClassicHome,
};

// siteTemplate ID → 템플릿 Home 컴포넌트. 미지정/미등록 값은 null(기본 홈으로 폴백).
export function resolveTemplateHome(siteTemplate: string | null | undefined): ComponentType<TemplateHomeProps> | null {
  if (!siteTemplate) return null;
  return TEMPLATE_HOMES[siteTemplate] ?? null;
}
