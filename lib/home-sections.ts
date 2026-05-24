export type HomeSectionKey = "banner" | "events" | "quick" | "worship" | "sermons" | "visit" | "pastor";

export const HOME_SECTION_KEYS: readonly HomeSectionKey[] = [
  "banner",
  "events",
  "quick",
  "worship",
  "sermons",
  "visit",
  "pastor",
] as const;

export const HOME_SECTION_LABELS: Record<HomeSectionKey, { title: string; desc: string }> = {
  banner: { title: "상단 배너", desc: "홈 최상단에 노출되는 배너 슬라이드" },
  events: { title: "다가오는 일정", desc: "다음 일정 카드 + 이후 일정 리스트" },
  quick: { title: "빠른 이동", desc: "예배 안내·설교·갤러리·찾아오시는 길 퀵 링크" },
  worship: { title: "예배 안내", desc: "주요 예배 일정 카드 묶음" },
  sermons: { title: "이번 주 말씀", desc: "최근 설교 영상 카드" },
  visit: { title: "방문 안내", desc: "처음 오시는 분들을 위한 안내 배너" },
  pastor: { title: "담임목사 인사", desc: "담임목사 사진과 인사말" },
};

export function normalizeHomeSectionOrder(input: string[] | null | undefined): HomeSectionKey[] {
  const valid = new Set<string>(HOME_SECTION_KEYS);
  const seen = new Set<HomeSectionKey>();
  const result: HomeSectionKey[] = [];
  for (const raw of input ?? []) {
    // 과거 `hero` 단일 키로 저장된 값은 events + quick 두 개로 펼침
    const keys = raw === "hero" ? (["events", "quick"] as HomeSectionKey[]) : ([raw] as HomeSectionKey[]);
    for (const key of keys) {
      if (valid.has(key) && !seen.has(key)) {
        result.push(key);
        seen.add(key);
      }
    }
  }
  for (const key of HOME_SECTION_KEYS) {
    if (!seen.has(key)) result.push(key);
  }
  return result;
}
