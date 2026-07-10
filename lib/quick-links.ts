import type { IconKey } from "@/components/icons";
import { type Lang, pick } from "@/lib/i18n";

// 홈 '바로가기' 후보 정의. 관리자가 이 중에서 노출할 항목을 고른다.
//  - kind "page": enabledPages에 pageId가 켜져 있어야 노출, /<pageId>로 이동
//  - kind "external": 해당 URL(youtube/instagram)이 입력돼 있어야 노출, 새 탭으로 이동
export type QuickLinkKey =
  | "worship"
  | "sermons"
  | "notices"
  | "schedule"
  | "gallery"
  | "community"
  | "youtube"
  | "instagram";

export type QuickLinkDef = {
  key: QuickLinkKey;
  title: string;
  desc: string;
  titleEn: string;
  descEn: string;
  ic: IconKey;
  kind: "page" | "external";
  pageId?: string;
  external?: "youtube" | "instagram";
};

export const QUICK_LINK_DEFS: QuickLinkDef[] = [
  { key: "worship", title: "예배 안내", desc: "주일·수요·새벽 모든 예배 시간을 확인하세요", titleEn: "Worship", descEn: "Find every Sunday, Wednesday, and dawn service time", ic: "calendar", kind: "page", pageId: "worship" },
  { key: "sermons", title: "설교 영상", desc: "지난 설교를 언제든 다시 듣고 묵상하세요", titleEn: "Sermons", descEn: "Revisit past sermons and reflect anytime", ic: "video", kind: "page", pageId: "sermons" },
  { key: "notices", title: "교회 소식", desc: "공지사항과 새 소식을 확인하세요", titleEn: "News", descEn: "Catch up on announcements and news", ic: "bell", kind: "page", pageId: "notices" },
  { key: "schedule", title: "일정", desc: "다가오는 교회 일정을 한눈에", titleEn: "Calendar", descEn: "See upcoming church events at a glance", ic: "calendar", kind: "page", pageId: "schedule" },
  { key: "gallery", title: "갤러리", desc: "공동체의 사진과 추억을 모아두는 곳", titleEn: "Gallery", descEn: "A place for our community's photos and memories", ic: "image", kind: "page", pageId: "gallery" },
  { key: "community", title: "교제", desc: "성도들과 나누는 따뜻한 소통의 공간", titleEn: "Community", descEn: "A warm space to connect with the congregation", ic: "users", kind: "page", pageId: "community" },
  { key: "youtube", title: "유튜브", desc: "예배와 설교 영상을 유튜브 채널에서 만나보세요", titleEn: "YouTube", descEn: "Watch worship and sermon videos on our YouTube channel", ic: "play", kind: "external", external: "youtube" },
  { key: "instagram", title: "인스타그램", desc: "교회의 일상과 소식을 인스타그램에서", titleEn: "Instagram", descEn: "Church life and updates on Instagram", ic: "instagram", kind: "external", external: "instagram" },
];

// 공개 홈의 '바로가기' 카드 라벨을 사이트 언어에 맞게 반환. (관리자 콘솔은 한국어 고정이라 title/desc 원본을 그대로 쓴다.)
export function quickLinkLabels(def: QuickLinkDef, lang: Lang): { title: string; desc: string } {
  return pick(lang, {
    ko: { title: def.title, desc: def.desc },
    en: { title: def.titleEn, desc: def.descEn },
  });
}

// 관리자가 따로 선택하지 않았을 때(homeQuickLinks 비어 있음)의 기본 노출 항목.
export const DEFAULT_QUICK_LINK_KEYS: QuickLinkKey[] = ["worship", "sermons", "gallery", "community"];

export function quickLinkDef(key: string): QuickLinkDef | undefined {
  return QUICK_LINK_DEFS.find((d) => d.key === key);
}
