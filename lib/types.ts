export type Brand = {
  name: string;
  eng: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  representative: string;
  businessNo: string;
  logoUrl: string | null;
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  children?: string[];
};

export type HeroFeature = {
  tag: string;
  title: string;
  desc: string;
  meta: string;
};

export type NewsItem = {
  day: string;
  mon: string;
  title: string;
  cat: string;
};

export type WorshipService = {
  tag: "WEEK" | "DAILY";
  name: string;
  time: string;
  meta: string;
  feat?: boolean;
};

export type Sermon = {
  series: string;
  title: string;
  pastor: string;
  date: string;
  duration: string;
  videoUrl?: string | null;
  grad: "ph-grad-1" | "ph-grad-2" | "ph-grad-3" | "ph-grad-4";
};

export type Department = {
  tag: string;
  name: string;
  age: string;
  leader: string;
  count: number;
};

export type SmallGroup = {
  name: string;
  count: number;
  meta: string;
};

export type Notice = {
  num: string;
  cat: string;
  title: string;
  author: string;
  date: string;
  pinned?: boolean;
};

export type EventItem = {
  date: string;
  title: string;
  meta: string;
};

export type GalleryItem = {
  title: string;
  date: string;
  grad: "ph-grad-1" | "ph-grad-2" | "ph-grad-3" | "ph-grad-4";
  photo?: string;
};

export type BibleToday = {
  day: number;
  title: string;
  passages: string[];
  progress: number;
  streak: number;
  totalDays: number;
};

export type QtStep = {
  step: string;
  q: string;
};

export type Pastor = {
  name: string;
  role: string;
  eng: string;
  message: string;
  longMessage: string;
  photo?: string;
};

export type VisionItem = {
  ko: string;
  en: string;
  desc: string;
};

export type HistoryItem = {
  y: string;
  t: string;
  d: string;
};

export type StaffMember = {
  name: string;
  role: string;
  area: string;
  photo?: string;
};

export type Transportation = {
  tag: string;
  icon: string;
  title: string;
  desc: string;
};

export type VerseOfWeek = {
  text: string;
  ref: string;
};

export type CalendarConfig = {
  year: number;
  month: number;
  today: number;
  eventDays: number[];
};

export type SiteData = {
  brand: Brand;
  nav: NavItem[];
  hero: { feature: HeroFeature; sideList: NewsItem[] };
  worshipServices: WorshipService[];
  sermons: Sermon[];
  sermonFilters: string[];
  departments: Department[];
  smallGroups: SmallGroup[];
  notices: Notice[];
  noticeCategories: string[];
  events: EventItem[];
  galleries: GalleryItem[];
  galleryCategories: string[];
  bibleToday: BibleToday;
  qt: QtStep[];
  pastor: Pastor;
  vision: VisionItem[];
  history: HistoryItem[];
  staff: StaffMember[];
  transportation: Transportation[];
  verseOfWeek: VerseOfWeek;
  calendar: CalendarConfig;
  footerNav: Record<string, string[]>;
};
