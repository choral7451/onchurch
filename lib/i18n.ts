// 공개 교회 사이트의 고정 UI 문구 다국어 처리.
// 교회가 입력한 콘텐츠(설교 제목·공지·소개 본문 등)는 번역 대상이 아니며 원문 그대로 노출된다.
// 관리자 콘솔은 한국어 고정이라 여기 대상이 아니다.

export type Lang = "ko" | "en";

export function normalizeLang(v: string | null | undefined): Lang {
  return v === "en" ? "en" : "ko";
}

// 각 파일에서 로컬 {ko, en} 사전을 만들고 이 헬퍼로 언어를 고른다.
export function pick<T>(lang: Lang, v: { ko: T; en: T }): T {
  return lang === "en" ? v.en : v.ko;
}

// 공개 네비 라벨 (nav item id → 라벨)
export const NAV_LABELS: Record<string, { ko: string; en: string }> = {
  about: { ko: "교회 소개", en: "About" },
  worship: { ko: "예배 안내", en: "Worship" },
  sermons: { ko: "말씀", en: "Sermons" },
  notices: { ko: "교회 소식", en: "News" },
  schedule: { ko: "일정", en: "Calendar" },
  gallery: { ko: "갤러리", en: "Gallery" },
  community: { ko: "교제", en: "Community" },
  prayer: { ko: "기도 요청", en: "Prayer" },
  directions: { ko: "찾아오시는 길", en: "Directions" },
};

// 푸터 컬럼 헤딩
export const FOOTER_HEADINGS = {
  church: { ko: "교회", en: "Church" },
  content: { ko: "콘텐츠", en: "Content" },
  more: { ko: "기타", en: "More" },
} as const;

// 셸(네비/유틸바/푸터) 공통 문구
export const SHELL = {
  prayerCta: { ko: "기도 요청", en: "Prayer" },
  openMenu: { ko: "메뉴 열기", en: "Open menu" },
  closeMenu: { ko: "메뉴 닫기", en: "Close menu" },
  menu: { ko: "메뉴", en: "Menu" },
  close: { ko: "닫기", en: "Close" },
  mobileMenu: { ko: "모바일 메뉴", en: "Mobile menu" },
  myAccount: { ko: "내 계정", en: "My Account" },
  adminPage: { ko: "관리자 페이지", en: "Admin" },
  myPage: { ko: "마이페이지", en: "My Page" },
  logout: { ko: "로그아웃", en: "Log out" },
  login: { ko: "로그인", en: "Log in" },
  businessNo: { ko: "사업자등록번호", en: "Business No." },
} as const;
