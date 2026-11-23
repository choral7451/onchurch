import { cache } from "react";

// 관리자 '디자인' 미리보기 전용 예시 콘텐츠.
// 갓 가입한 교회는 설교·소식·앨범·일정이 하나도 없어서, 섹션을 켜도 홈에 아무것도 안 나와 어떻게 보일지 알 수 없다.
// 그래서 미리보기(?design= 쿼리로 그리는 홈)에서만, 비어 있는 섹션에 예시 글을 채워 보여준다.
// 공개 홈(방문자)에는 절대 나오지 않는다 — app/[tenant]/page.tsx 가 미리보기일 때만 enableSampleContent() 를 부른다.

// 요청 하나 동안만 유지되는 표시(React cache 는 서버 요청 단위로 초기화된다).
const sampleState = cache(() => ({ on: false }));

export function enableSampleContent(): void {
  sampleState().on = true;
}

export function isSampleContentOn(): boolean {
  return sampleState().on;
}

const DAY = 24 * 60 * 60 * 1000;

function isoDaysFromNow(days: number, hour = 11): string {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(hour - 9, 0, 0, 0); // 한국 시간 기준 시각
  return d.toISOString();
}

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
}

// 소식 예시 — 카테고리 카드가 여러 개로 나뉘어 보이도록 카테고리별로 글을 둔다.
const SAMPLE_NOTICE_CATEGORY_NAMES = ["공지사항", "교회행사", "주보"];
const SAMPLE_NOTICE_TITLES = [
  ["예시 · 이번 주 교회 소식", "예시 · 주차 안내와 예배 시간 변경", "예시 · 새가족 등록 안내"],
  ["예시 · 새가족 환영회 안내", "예시 · 여름 수련회 신청을 받습니다", "예시 · 전교인 체육대회"],
  ["예시 · 이번 주 주보", "예시 · 지난주 주보", "예시 · 2주 전 주보"],
];

function sampleNotices(categoryNames: string[]) {
  const names = categoryNames.length ? categoryNames.slice(0, 3) : SAMPLE_NOTICE_CATEGORY_NAMES;
  let id = 0;
  return names.flatMap((name, ci) =>
    SAMPLE_NOTICE_TITLES[ci % SAMPLE_NOTICE_TITLES.length].map((title, i) => {
      id -= 1;
      return { id, category: name, title, publishedAt: null, createdAt: isoDaysFromNow(-(ci + i * 4 + 1)) };
    }),
  );
}

const SAMPLE_NOTICE_CATEGORIES = SAMPLE_NOTICE_CATEGORY_NAMES.map((name, i) => ({ id: -(i + 1), name, sortOrder: i + 1, isActive: true, isAll: false }));

const SAMPLE_SERMONS = [
  { id: -1, seriesId: null, title: "예시 · 두려워하지 말라", pastor: "담임목사", date: dateDaysAgo(2), duration: "38:12", videoUrl: null, isFeatured: true },
  { id: -2, seriesId: null, title: "예시 · 감사의 사람", pastor: "담임목사", date: dateDaysAgo(9), duration: "41:05", videoUrl: null, isFeatured: false },
  { id: -3, seriesId: null, title: "예시 · 함께 걷는 길", pastor: "담임목사", date: dateDaysAgo(16), duration: "35:47", videoUrl: null, isFeatured: false },
];

const SAMPLE_GALLERY = [
  { groupKey: "sample-1", title: "예시 · 부활절 연합 예배", date: dateDaysAgo(3), coverUrl: null, grad: null, count: 12 },
  { groupKey: "sample-2", title: "예시 · 청년부 수련회", date: dateDaysAgo(10), coverUrl: null, grad: null, count: 24 },
  { groupKey: "sample-3", title: "예시 · 성탄 축하 발표회", date: dateDaysAgo(20), coverUrl: null, grad: null, count: 18 },
];

const SAMPLE_EVENTS = [
  { id: -1, title: "예시 · 새가족 환영회", description: "새로 오신 분들을 환영하는 시간입니다.", location: "본당 1층 친교실", startAt: isoDaysFromNow(3, 13), endAt: null, isAllDay: false },
  { id: -2, title: "예시 · 전교인 체육대회", description: null, location: "교회 운동장", startAt: isoDaysFromNow(10, 10), endAt: null, isAllDay: false },
  { id: -3, title: "예시 · 여름 성경학교", description: null, location: "교육관", startAt: isoDaysFromNow(17, 9), endAt: null, isAllDay: true },
];

const SAMPLE_WORSHIP = [
  { id: -1, tag: "WEEK", name: "주일 1부 예배", time: "오전 9:00", meta: "본당", isFeatured: true },
  { id: -2, tag: "WEEK", name: "주일 2부 예배", time: "오전 11:00", meta: "본당", isFeatured: false },
  { id: -3, tag: "WEEK", name: "수요 예배", time: "오후 7:30", meta: "본당", isFeatured: false },
  { id: -4, tag: "DAILY", name: "새벽 기도회", time: "오전 5:30", meta: "본당 (월~금)", isFeatured: false },
];

const SAMPLE_PASTOR = {
  id: -1,
  name: "담임목사",
  role: "담임목사",
  eng: null,
  message: "예시 인사말입니다. 우리 교회 홈페이지를 찾아 주셔서 감사합니다. 관리자 페이지의 '담임목사 인사'에서 사진과 인사말을 넣으면 이 자리에 보입니다.",
  photoUrl: null,
};

const empty = (v: unknown) => !Array.isArray(v) || v.length === 0;

type NoticeCategory = { name: string; isActive: boolean; isAll: boolean };

async function fetchItem<T>(apiBase: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase}${path}`, { cache: "no-store" });
    const body = await res.json();
    return (body?.item ?? null) as T | null;
  } catch {
    return null;
  }
}

// 실제 공지가 있는지 / 교회가 정해 둔 공지 카테고리(전체 제외, 켜진 것) — 예시 글을 그 카테고리에 나눠 담는다.
const hasNotices = cache(async (apiBase: string, slug: string): Promise<boolean> => {
  const item = await fetchItem<{ notices?: unknown[] }>(apiBase, `/onchurch/sites/${slug}/notices?page=1&size=1`);
  return item === null || (Array.isArray(item.notices) && item.notices.length > 0);
});
const activeCategoryNames = cache(async (apiBase: string, slug: string): Promise<string[]> => {
  const item = await fetchItem<{ categories?: NoticeCategory[] }>(apiBase, `/onchurch/sites/${slug}/notice-categories`);
  return (item?.categories ?? []).filter((c) => c.isActive && !c.isAll).map((c) => c.name);
});

/**
 * 미리보기에서만, 비어 있는 공개 사이트 API 응답을 예시 콘텐츠로 바꾼다. 미리보기가 아니면 그대로 돌려준다.
 * path 는 `/onchurch/sites/{slug}/...` 형태.
 */
export async function withSampleContent<T>(apiBase: string, path: string, value: T): Promise<T> {
  if (!isSampleContentOn()) return value;
  const m = path.match(/^\/onchurch\/sites\/([^/?]+)\/([^?]+)/);
  if (!m) return value;
  const [, slug, resource] = m;
  const v = (value ?? {}) as Record<string, unknown>;
  switch (resource) {
    case "notices":
      return (empty(v.notices) ? { ...v, notices: sampleNotices(await activeCategoryNames(apiBase, slug)) } : value) as T;
    case "notice-categories": {
      // 글이 없고 카테고리도 안 만든 교회는 예시 카테고리 3개로 나눠 보여준다.
      if (await hasNotices(apiBase, slug)) return value;
      const own = Array.isArray(v.categories) ? (v.categories as NoticeCategory[]).filter((c) => c.isActive && !c.isAll) : [];
      return (own.length ? value : { ...v, categories: SAMPLE_NOTICE_CATEGORIES }) as T;
    }
    case "sermons":
      return (empty(v.sermons) ? { ...v, sermons: SAMPLE_SERMONS } : value) as T;
    case "galleries":
      return (empty(v.groups) ? { ...v, groups: SAMPLE_GALLERY } : value) as T;
    case "events": {
      // 지난 일정만 있어도 홈의 '다가오는 일정'은 비므로, 앞으로의 일정이 없으면 예시를 덧붙인다.
      const events = Array.isArray(v.events) ? (v.events as { startAt?: string }[]) : [];
      const now = Date.now();
      const hasUpcoming = events.some((e) => e.startAt && new Date(e.startAt).getTime() >= now);
      return (hasUpcoming ? value : { ...v, events: [...events, ...SAMPLE_EVENTS] }) as T;
    }
    case "worship":
      return (empty(v.services) ? { ...v, services: SAMPLE_WORSHIP } : value) as T;
    case "about": {
      const pastor = v.pastor as { name?: string; message?: string | null } | null | undefined;
      return (!pastor || (!pastor.message?.trim() && !pastor.name) ? { ...v, pastor: SAMPLE_PASTOR } : value) as T;
    }
    default:
      return value;
  }
}
