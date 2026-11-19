import type { CSSProperties } from "react";
import { resolveTemplateId } from "@/components/templates/meta";
import { HOME_SECTION_LABELS, normalizeHomeSectionOrder, type HomeSectionKey } from "@/lib/home-sections";

// 공개 홈페이지 '디자인 설정' — 섹션별 디자인(기본/모던) + 메인·포인트 색.
// 서버 onchurch_churches.site_design(jsonb) 에 그대로 저장되며, null 이면 미설정이다.
//
// 미설정(null) 교회는 기존처럼 site_template(기본/모던) 홈을 통째로 렌더한다 — 기존 교회에 영향 없음.
// 설정이 있는 교회만 섹션마다 기본/모던 구현을 골라 섞어 렌더한다(components/templates/mixed-home.tsx).

export type SectionDesignId = "default" | "modern";

export type SiteDesignColors = { main: string; point: string };

export type SiteDesign = {
  colors: SiteDesignColors | null;
  sections: Partial<Record<HomeSectionKey, SectionDesignId>>;
};

// 관리자 미리보기용: 저장 전 초안을 쿼리로 넘길 때 섹션 순서까지 함께 싣는다.
export type SiteDesignPreview = SiteDesign & { order?: string[] };

export const SECTION_DESIGN_IDS: readonly SectionDesignId[] = ["default", "modern"] as const;

// 섹션별로 고를 수 있는 디자인. 모든 섹션에 기본·모던 구현이 있다.
export const SECTION_DESIGN_LABELS: Record<SectionDesignId, string> = { default: "기본", modern: "모던" };

export function sectionDesignLabel(_key: HomeSectionKey, id: SectionDesignId): string {
  return SECTION_DESIGN_LABELS[id];
}

const HEX = /^#[0-9a-f]{6}$/;

function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return HEX.test(s) ? s : null;
}

// 서버 저장값·미리보기 쿼리 등 외부 입력을 안전한 형태로 정리한다. 설정이 하나도 없으면 null.
export function normalizeSiteDesign(input: unknown): SiteDesign | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as { colors?: unknown; sections?: unknown };
  let colors: SiteDesignColors | null = null;
  if (raw.colors && typeof raw.colors === "object") {
    const c = raw.colors as { main?: unknown; point?: unknown };
    const main = normalizeHex(c.main);
    const point = normalizeHex(c.point);
    if (main && point) colors = { main, point };
  }
  const sections: Partial<Record<HomeSectionKey, SectionDesignId>> = {};
  if (raw.sections && typeof raw.sections === "object" && !Array.isArray(raw.sections)) {
    for (const [k, v] of Object.entries(raw.sections as Record<string, unknown>)) {
      if (!(k in HOME_SECTION_LABELS)) continue;
      if (v !== "default" && v !== "modern") continue;
      sections[k as HomeSectionKey] = v;
    }
  }
  if (!colors && Object.keys(sections).length === 0) return null;
  return { colors, sections };
}

// 템플릿이 기본이면 모든 섹션 기본, 모던이면 모든 섹션 모던 — 설정이 없을 때의 섹션별 기본값.
export function baseSectionDesign(siteTemplate: string | null | undefined): SectionDesignId {
  return resolveTemplateId(siteTemplate) === "modern" ? "modern" : "default";
}

export function resolveSectionDesign(design: SiteDesign | null, siteTemplate: string | null | undefined, key: HomeSectionKey): SectionDesignId {
  return design?.sections[key] ?? baseSectionDesign(siteTemplate);
}

// 섞어 렌더할 때의 섹션 순서. 두 템플릿의 합집합(모던 목록이 상위집합)을 기준으로 정규화한다.
export function mixedSectionOrder(order: string[] | null | undefined): HomeSectionKey[] {
  return normalizeHomeSectionOrder(order, "modern");
}

// 메인·포인트 색을 두 템플릿의 CSS 변수로 풀어 쓴다.
// 기본 템플릿: :root 의 --primary/--accent 계열. 모던 템플릿: .chc-root 가 --site-* 를 읽도록 globals.css 에 폴백을 둔다.
export function siteColorVars(colors: SiteDesignColors): CSSProperties & Record<`--${string}`, string> {
  const { main, point } = colors;
  return {
    "--primary": main,
    "--primary-deep": `color-mix(in oklab, ${main} 78%, black)`,
    "--primary-soft": `color-mix(in oklab, ${main} 85%, white)`,
    "--accent": point,
    "--accent-glow": `color-mix(in oklab, ${point} 65%, white)`,
    "--site-main": main,
    "--site-point": point,
    "--site-point-hover": `color-mix(in oklab, ${point} 85%, black)`,
    "--site-point-soft": `color-mix(in oklab, ${point} 10%, white)`,
  } as CSSProperties & Record<`--${string}`, string>;
}

// 관리자 추천 색조합. 밝은 → 중간 → 어두운 순서로 묶어 보여준다.
// 메인은 흰 글자가 올라가는 배경·제목에 쓰이므로 밝은 조합도 흰 글자가 읽히는 명도까지만 밝힌다.
// navy 는 기본 템플릿, slate 는 모던 템플릿의 원래 색과 같다.
export type SiteColorTone = "bright" | "medium" | "dark";
export const SITE_COLOR_TONE_LABELS: Record<SiteColorTone, string> = { bright: "밝은 조합", medium: "차분한 조합", dark: "어두운 조합" };
export const SITE_COLOR_PRESETS: { id: string; label: string; main: string; point: string; tone: SiteColorTone }[] = [
  { id: "sky", label: "스카이 · 민트", main: "#2b78c2", point: "#22a699", tone: "bright" },
  { id: "teal", label: "청록 · 코랄", main: "#137a74", point: "#e8674a", tone: "bright" },
  { id: "green", label: "그린 · 라임", main: "#2a8250", point: "#7fae2f", tone: "bright" },
  { id: "coral", label: "코랄 · 네이비", main: "#cc4d37", point: "#2d4a6b", tone: "bright" },
  { id: "rose", label: "로즈 · 플럼", main: "#c2476b", point: "#7b3f73", tone: "bright" },
  { id: "violet", label: "바이올렛 · 핑크", main: "#6d4fc2", point: "#d9578f", tone: "bright" },
  { id: "royal", label: "로열블루 · 옐로", main: "#2452a6", point: "#d99a1c", tone: "medium" },
  { id: "navy", label: "네이비 · 스카이", main: "#1f3a5f", point: "#3b82c4", tone: "medium" },
  { id: "forest", label: "딥그린 · 골드", main: "#1f4d3a", point: "#c69a3c", tone: "medium" },
  { id: "wine", label: "버건디 · 로즈", main: "#5e1f2e", point: "#c0586e", tone: "medium" },
  { id: "brown", label: "브라운 · 베이지", main: "#5a4030", point: "#b08a5c", tone: "medium" },
  { id: "plum", label: "플럼 · 라벤더", main: "#4a2a5e", point: "#8f72cc", tone: "medium" },
  { id: "slate", label: "슬레이트 · 블루", main: "#14283d", point: "#1e3a5f", tone: "dark" },
  { id: "midnight", label: "미드나잇 · 민트", main: "#0f1f33", point: "#2fa896", tone: "dark" },
  { id: "charcoal", label: "차콜 · 오렌지", main: "#2c2f36", point: "#d9742a", tone: "dark" },
  { id: "black", label: "블랙 · 골드", main: "#16181d", point: "#b8923c", tone: "dark" },
];

// 미리보기 쿼리(?design=) 직렬화. 관리자 초안을 공개 홈에 넘겨 저장 없이 렌더한다.
export function encodeDesignPreview(preview: SiteDesignPreview): string {
  return encodeURIComponent(JSON.stringify(preview));
}

export function decodeDesignPreview(raw: string | string[] | undefined): { design: SiteDesign | null; order: string[] | null } | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) return null;
  try {
    const parsed = JSON.parse(s) as { order?: unknown };
    const design = normalizeSiteDesign(parsed);
    const order = Array.isArray(parsed.order) ? parsed.order.filter((k): k is string => typeof k === "string") : null;
    return { design, order };
  } catch {
    return null;
  }
}
