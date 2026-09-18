export type HomeSectionKey =
  | "banner"
  | "events"
  | "quick"
  | "worship"
  | "sermons"
  | "visit"
  | "pastor"
  | "news"
  | "gallery";

// 모든 템플릿이 공통으로 렌더하는 섹션(기본 템플릿의 전체 목록).
export const HOME_SECTION_KEYS: readonly HomeSectionKey[] = [
  "banner",
  "events",
  "quick",
  "worship",
  "sermons",
  "visit",
  "pastor",
] as const;

// 클래식 전용: 공통 섹션 + 소식(말씀 뒤) + 갤러리(맨 끝).
// 배열 순서 = 저장된 순서가 없을 때의 기본 배치이자, 새 섹션을 끼워 넣을 기준 위치.
export const CLASSIC_HOME_SECTION_KEYS: readonly HomeSectionKey[] = [
  "banner",
  "events",
  "quick",
  "worship",
  "sermons",
  "news",
  "visit",
  "pastor",
  "gallery",
] as const;

// 템플릿 ID → 그 템플릿이 렌더하는 섹션 목록. 미등록 템플릿은 공통 목록.
// 템플릿 추가/매핑은 components/templates/meta.ts·registry.tsx 참고.
const KEYS_BY_TEMPLATE: Record<string, readonly HomeSectionKey[]> = {
  classic: CLASSIC_HOME_SECTION_KEYS,
};

export function homeSectionKeys(siteTemplate?: string | null): readonly HomeSectionKey[] {
  return (siteTemplate && KEYS_BY_TEMPLATE[siteTemplate]) || HOME_SECTION_KEYS;
}

export const HOME_SECTION_LABELS: Record<HomeSectionKey, { title: string; desc: string }> = {
  banner: { title: "상단 배너", desc: "홈 최상단에 노출되는 배너 슬라이드" },
  events: { title: "다가오는 일정", desc: "다음 일정 카드 + 이후 일정 리스트" },
  quick: { title: "빠른 이동", desc: "예배 안내·설교·갤러리·찾아오시는 길 퀵 링크" },
  worship: { title: "예배 안내", desc: "주요 예배 일정 카드 묶음" },
  sermons: { title: "함께 드리는 예배", desc: "최근 설교 영상 카드" },
  visit: { title: "방문 안내", desc: "처음 오시는 분들을 위한 안내 배너" },
  pastor: { title: "담임목사 인사", desc: "담임목사 사진과 인사말" },
  news: { title: "교회 소식", desc: "공지 카테고리별 최신 글 목록 (모던 템플릿 전용)" },
  gallery: { title: "갤러리", desc: "최근 사진 앨범 카드 (모던 템플릿 전용)" },
};

export function normalizeHomeSectionOrder(
  input: string[] | null | undefined,
  siteTemplate?: string | null,
): HomeSectionKey[] {
  const keys = homeSectionKeys(siteTemplate);
  const valid = new Set<string>(keys);
  const seen = new Set<HomeSectionKey>();
  const result: HomeSectionKey[] = [];
  for (const raw of input ?? []) {
    // 과거 `hero` 단일 키로 저장된 값은 events + quick 두 개로 펼침
    const expanded = raw === "hero" ? (["events", "quick"] as HomeSectionKey[]) : ([raw] as HomeSectionKey[]);
    for (const key of expanded) {
      if (valid.has(key) && !seen.has(key)) {
        result.push(key);
        seen.add(key);
      }
    }
  }
  // 저장값에 없는 키는 기본 순서상 바로 앞에 오는 섹션 뒤에 끼워 넣는다.
  // 맨 뒤에 몰아 붙이면 섹션이 새로 추가될 때 기존 교회 홈의 배치가 바뀌므로.
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (seen.has(key)) continue;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const pos = result.indexOf(keys[j]);
      if (pos >= 0) {
        at = pos + 1;
        break;
      }
    }
    result.splice(at, 0, key);
    seen.add(key);
  }
  return result;
}
