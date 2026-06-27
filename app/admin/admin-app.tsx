"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { AddressPicker } from "@/components/address-picker";
import type {
  Brand,
  EventItem,
  HistoryItem,
  NavItem,
  Notice,
  Pastor,
  StaffMember,
  Transportation,
  VisionItem,
} from "@/lib/types";
import {
  ApiError,
  clearTokens,
  saveSessionChurch,
  onchurchChurch,
  onchurchPastor,
  onchurchUser,
  onchurchWorshipService,
  uploadImages,
  type Subscription,
} from "@/lib/api-client";
import { WorshipEditor } from "./page-editors/worship";
import { NoticesEditor } from "./page-editors/notices";
import { ScheduleEditor } from "./page-editors/schedule";
import { AboutEditor } from "./page-editors/about";
import { OnboardPastorName, OnboardFirstWorship } from "./page-editors/onboard-mini";
import { DirectionsEditor } from "./page-editors/directions";
import { GalleryEditor } from "./page-editors/gallery";
import { CommunityEditor } from "./page-editors/community";
import { MembersEditor } from "./page-editors/members";
import { SaintsEditor } from "./page-editors/saints";
import { VisitationsEditor } from "./page-editors/visitations";
import { AttendanceEditor } from "./page-editors/attendance";
import { BannersEditor } from "./page-editors/banners";
import { SermonsEditor } from "./page-editors/sermons";
import { PrayerEditor } from "./page-editors/prayer";
import { HomeOrderEditor } from "./page-editors/home-order";
import { QUICK_LINK_DEFS, DEFAULT_QUICK_LINK_KEYS } from "@/lib/quick-links";
// import { BulletinEditor } from "./page-editors/bulletin"; // 주보 만들기 - 임시 숨김
import { normalizeHomeSectionOrder, type HomeSectionKey } from "@/lib/home-sections";

type Initial = {
  slug: string;
  brand: Brand;
  nav: NavItem[];
  notices: Notice[];
  noticeCategories: string[];
  events: EventItem[];
  pastor: Pastor;
  vision: VisionItem[];
  history: HistoryItem[];
  staff: StaffMember[];
  transportation: Transportation[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

const PREVIEW_ROOTS = ["everychurch.co.kr", "onchurch.kr", "localhost"];

function buildPreviewUrl(slug: string): string {
  if (typeof window === "undefined") return `/${slug}`;
  const { protocol, host } = window.location;
  const [hostname, port] = host.split(":");
  const portSuffix = port ? `:${port}` : "";
  for (const root of PREVIEW_ROOTS) {
    if (hostname === root || hostname.endsWith(`.${root}`)) {
      return `${protocol}//${slug}.${root}${portSuffix}`;
    }
  }
  return `/${slug}`;
}

const BOARD_DESCRIPTIONS: Record<string, string> = {
  about: "담임목사 인사 · 비전 · 연혁 · 섬김의 사람들",
  worship: "주일/수요/새벽 예배 안내",
  sermons: "설교 영상 · 카테고리 필터",
  notices: "공지사항",
  schedule: "행사 캘린더 · 다가오는 일정",
  departments: "유아부부터 청년부까지 · 소그룹",
  prayer: "기도 요청 폼 · 익명 옵션",
  gallery: "사진 갤러리",
  community: "성도 교제 게시판 · 글/사진/영상 · 사후 관리",
  bible: "성경 통독 · QT 가이드",
};

type SectionKey = "start" | "site" | "logo" | "contact" | "banners" | "home-order" | "bulletin" | "billing" | "members" | "saints-roster" | "visitations" | "attendance" | "settings" | `page:${string}`;

type NavGroup = "home" | "saints";

function formatYMD(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function daysLeft(iso: string): number {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return 0;
  // 시·분 단위 잔여시간이 올림되지 않도록 달력 날짜(연·월·일)끼리 차이를 센다.
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const now = new Date();
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((endDay.getTime() - todayDay.getTime()) / (24 * 60 * 60 * 1000)));
}

function SubscriptionBadge({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) return null;
  const now = Date.now();
  const paidActive = subscription.paidUntil && new Date(subscription.paidUntil).getTime() > now;
  const trialActive = subscription.freeTrialUntil && new Date(subscription.freeTrialUntil).getTime() > now;

  if (paidActive && subscription.paidUntil) {
    return (
      <div className="admin-sub-badge paid" title="유료 결제 유효 기간">
        <span className="admin-sub-badge-label">유효기간</span>
        <span className="admin-sub-badge-date">~{formatYMD(subscription.paidUntil)}</span>
        <span className="admin-sub-badge-rem">D-{daysLeft(subscription.paidUntil)}</span>
      </div>
    );
  }
  if (trialActive && subscription.freeTrialUntil) {
    return (
      <div className="admin-sub-badge trial" title="무료 체험 유효 기간">
        <span className="admin-sub-badge-label">무료체험</span>
        <span className="admin-sub-badge-date">~{formatYMD(subscription.freeTrialUntil)}</span>
        <span className="admin-sub-badge-rem">D-{daysLeft(subscription.freeTrialUntil)}</span>
      </div>
    );
  }
  if (subscription.freeTrialUntil || subscription.paidUntil) {
    return (
      <div className="admin-sub-badge expired" title="구독 만료">
        <span className="admin-sub-badge-label">만료</span>
        <span className="admin-sub-badge-rem">결제 필요</span>
      </div>
    );
  }
  return null;
}

const PAYMENT_INFO = {
  bank: "국민은행",
  account: "029302-04-342479",
  holder: "임성준",
  monthly: "월 10,000원",
  yearly: "1년 100,000원",
  note: "입금 후 1영업일 이내 적용됩니다.",
};

function PaymentAccountCard() {
  const [copied, setCopied] = useState(false);
  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(PAYMENT_INFO.account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 미지원 환경 — 무시
    }
  }
  return (
    <div className="payment-account-card">
      <div className="payment-account-head">
        <span className="payment-account-bank">{PAYMENT_INFO.bank}</span>
        <span className="payment-account-holder">예금주 {PAYMENT_INFO.holder}</span>
      </div>
      <div className="payment-account-number-row">
        <span className="payment-account-number">{PAYMENT_INFO.account}</span>
        <button type="button" className="btn btn-secondary" onClick={copyAccount}>
          {copied ? "복사됨 ✓" : "계좌 복사"}
        </button>
      </div>
      <div className="payment-account-plans">
        <div className="payment-account-plan">
          <span className="payment-account-plan-label">월간</span>
          <span className="payment-account-plan-price">{PAYMENT_INFO.monthly}</span>
        </div>
        <div className="payment-account-plan highlight">
          <span className="payment-account-plan-label">연간</span>
          <span className="payment-account-plan-price">{PAYMENT_INFO.yearly}</span>
          <span className="payment-account-plan-badge">2개월 무료</span>
        </div>
      </div>
      <p className="payment-account-note">{PAYMENT_INFO.note}</p>
    </div>
  );
}

const DENOMINATION_LOGOS: { url: string; label: string }[] = [
  {
    url: "https://artinfo.s3.ap-northeast-2.amazonaws.com/prod/upload/4637/images/20260514/original/vRdPYqpdur3.1778733691840.png",
    label: "대한예수교장로회(통합)",
  },
  {
    url: "https://artinfo.s3.ap-northeast-2.amazonaws.com/prod/upload/4637/images/20260514/original/OKJGqefGvX-.1778733732780.png",
    label: "대한예수교장로회(합동)",
  },
  {
    url: "https://artinfo.s3.ap-northeast-2.amazonaws.com/prod/upload/4637/images/20260514/original/LoQ8Kn7xb6T.1778733771412.png",
    label: "기독교대한감리회",
  },
  {
    url: "https://artinfo.s3.ap-northeast-2.amazonaws.com/prod/upload/4637/images/20260614/original/NIb1Gb24J3P.1781432921408.png",
    label: "기독교대한성결교회",
  },
];

export function AdminApp({ initial }: { initial: Initial }) {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<SectionKey>("start");
  // 사이드바 최상위 구분: 홈페이지 / 성도관리
  const [navGroup, setNavGroup] = useState<NavGroup>("home");
  // 모바일: 메뉴 목록(false) ↔ 상세 화면(true) 전환. 데스크톱은 무시되고 항상 둘 다 노출.
  const [mobileDetail, setMobileDetail] = useState(false);

  // 사이드바 항목 탭 → 해당 섹션 열고 모바일에선 상세 화면으로 진입.
  function openSection(key: SectionKey) {
    setActiveSection(key);
    setMobileDetail(true);
  }

  function selectNavGroup(group: NavGroup) {
    setNavGroup(group);
    setMobileDetail(false); // 그룹 전환 시 모바일은 메뉴 목록부터 보여준다.
    if (group === "saints") setActiveSection("saints-roster");
    else setActiveSection("site");
  }
  // 시작하기 화면에서 현재 펼쳐진 단계(아코디언). 기본은 첫 단계.
  const [openStep, setOpenStep] = useState<SectionKey | null>("site");

  const [slug, setSlug] = useState(initial.slug);
  const [name, setName] = useState(initial.brand.name);
  const [eng, setEng] = useState(initial.brand.eng);
  const [tagline, setTagline] = useState(initial.brand.tagline);
  const [phone, setPhone] = useState(initial.brand.phone);
  const [email, setEmail] = useState(initial.brand.email);
  const [address, setAddress] = useState(initial.brand.address);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [liveSaving, setLiveSaving] = useState(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoErr, setLogoErr] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const ABOUT_SUB_KEYS = ["about-vision", "about-history", "about-staff"] as const;

  const [boards, setBoards] = useState<Record<string, boolean>>(
    () => {
      // 새 교회는 온오프 선택 페이지를 모두 ON으로 시작한다(첫 저장 시 전부 노출).
      const base = Object.fromEntries(initial.nav.map((n) => [n.id, true]));
      base["about"] = true;
      base["worship"] = true;
      base["directions"] = true;
      // 비전·연혁·섬김의 사람들도 새 교회는 기본 공개로 시작한다(첫 저장 시 함께 노출).
      for (const k of ABOUT_SUB_KEYS) base[k] = true;
      return base;
    },
  );

  const [homeSectionOrder, setHomeSectionOrder] = useState<HomeSectionKey[]>(() => normalizeHomeSectionOrder([]));
  const [homeQuickLinks, setHomeQuickLinks] = useState<string[]>([]);
  const [quickLimitMsg, setQuickLimitMsg] = useState("");

  const [notices, setNotices] = useState<Notice[]>(initial.notices);
  const [noticeCategories, setNoticeCategories] = useState<string[]>(initial.noticeCategories);
  const [events, setEvents] = useState<EventItem[]>(initial.events);

  const [pastor, setPastor] = useState<Pastor>(initial.pastor);
  const [vision, setVision] = useState<VisionItem[]>(initial.vision);
  const [history, setHistory] = useState<HistoryItem[]>(initial.history);
  const [staff, setStaff] = useState<StaffMember[]>(initial.staff);

  const [save, setSave] = useState<SaveState>("idle");
  const [saveMsg, setSaveMsg] = useState<string>("");
  const [saveToast, setSaveToast] = useState<string>("");
  // 홈페이지 버튼: 사이트 운영 OFF일 때 안내 토스트
  const [publishHint, setPublishHint] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  const [isPublished, setIsPublished] = useState(false);
  // 온보딩(시작 가이드) 완료 = first_published_at not null (한 번이라도 사이트 오픈).
  // true가 되면 시작하기를 숨기고 사이드바를 노출한다. 이후 OFF해도 유지.
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [churchExistsOnServer, setChurchExistsOnServer] = useState(false);
  const [slugLocked, setSlugLocked] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [modal, setModal] = useState<null | "required" | "payment" | "trial-started">(null);
  const [trialEndDateLabel, setTrialEndDateLabel] = useState<string>("");

  const [aboutFilled, setAboutFilled] = useState(false);
  const [worshipFilled, setWorshipFilled] = useState(false);

  // 시작하기 단계의 초록 체크는 '저장된 값' 기준으로 표시한다(입력 중에는 변하지 않음).
  const [savedRequired, setSavedRequired] = useState({ slug: "", name: "", phone: "", email: "", address: "" });

  async function refreshRequiredStatus() {
    try {
      const [pastorRes, services, churchRes] = await Promise.all([
        onchurchPastor.getMine().catch(() => ({ pastor: null })),
        onchurchWorshipService.listMine().catch(() => []),
        onchurchChurch.getMine().catch(() => null),
      ]);
      setAboutFilled(!!pastorRes?.pastor?.name?.trim());
      setWorshipFilled((services?.length ?? 0) > 0);
      if (churchRes?.church) setIsPublished(churchRes.church.isPublished);
      if (churchRes?.subscription) setSubscription(churchRes.subscription);
    } catch {
      // ignore — pill will just stay incomplete
    }
  }

  useEffect(() => {
    void refreshRequiredStatus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await onchurchChurch.getMine();
        if (cancelled) return;
        // 교회를 소유하지 않은 순수 성도(MEMBER)는 관리 콘솔 접근 불가.
        // (교회 소유자는 role과 무관하게 허용 — 기존 데이터 보호)
        if (!res?.church) {
          try {
            const profile = await onchurchUser.getMe();
            if (cancelled) return;
            // 마스터는 교회가 없어도 관리 콘솔에 접근할 수 있다.
            if (profile.role !== "admin" && profile.role !== "master") {
              alert("교회 관리자 계정만 접근할 수 있습니다.");
              router.push("/");
              return;
            }
          } catch {
            /* 프로필 조회 실패 시 일단 통과 (아래 로직에서 처리) */
          }
        }
        if (res?.church) {
          const c = res.church;
          setSlug(c.slug);
          // 관리자 로그인은 성도 세션(sessionChurch)을 따로 만들지 않아, 자기 교회 홈을 열면
          // 로그아웃처럼 보였다. 콘솔이 자기 교회를 로드하면 세션을 그 교회로 기록해 동일 로그인으로 인식시킨다.
          if (c.slug) saveSessionChurch(c.slug);
          if (c.slug) setSlugLocked(true);
          setName(c.name);
          setEng(c.eng ?? "");
          setTagline(c.tagline ?? "");
          setPhone(c.phone ?? "");
          setEmail(c.email ?? "");
          setAddress(c.address ?? "");
          setSavedRequired({
            slug: c.slug ?? "",
            name: c.name ?? "",
            phone: c.phone ?? "",
            email: c.email ?? "",
            address: c.address ?? "",
          });
          if (c.logoUrl) setLogoPreview(c.logoUrl);
          setYoutubeUrl(c.youtubeUrl ?? null);
          setInstagramUrl(c.instagramUrl ?? null);
          setHomeQuickLinks(c.homeQuickLinks ?? []);
          setLiveUrl(c.liveUrl ?? null);
          setIsLive(c.isLive ?? false);
          if (c.enabledPages?.length) {
            const next: Record<string, boolean> = {};
            for (const n of initial.nav) next[n.id] = c.enabledPages.includes(n.id);
            next["about"] = true;
            next["worship"] = true;
            next["directions"] = true;
            for (const k of ABOUT_SUB_KEYS) next[k] = c.enabledPages.includes(k);
            setBoards(next);
          }
          setHomeSectionOrder(normalizeHomeSectionOrder(c.homeSectionOrder ?? []));
          setIsPublished(c.isPublished);
          setOnboardingDone(!!c.firstPublishedAt);
          setChurchExistsOnServer(true);
        }
        if (res?.subscription) setSubscription(res.subscription);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          router.push("/login");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial.nav, router]);

  const previewSlug = slug || initial.slug;
  const [previewHref, setPreviewHref] = useState(`/${previewSlug}`);
  useEffect(() => {
    setPreviewHref(buildPreviewUrl(previewSlug));
  }, [previewSlug]);

  const [slugCheck, setSlugCheck] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const trimmedSlug = slug.trim();
  // 저장된 값 기준 — 입력만 하고 저장하지 않으면 체크가 켜지지 않는다.
  const siteRequiredFilled = !!savedRequired.slug.trim() && !!savedRequired.name.trim();
  const contactRequiredFilled = !!savedRequired.phone.trim() && !!savedRequired.email.trim() && !!savedRequired.address.trim();
  const allRequiredFilled = siteRequiredFilled && contactRequiredFilled && aboutFilled && worshipFilled;

  // 사이트 공개에 꼭 필요한 4단계 — '시작하기' 화면과 사이드바 진척 표시에 함께 사용.
  const requiredSteps: { label: string; desc: string; done: boolean; target: SectionKey }[] = [
    { label: "기본 정보", desc: "서브도메인 · 교회 이름", done: siteRequiredFilled, target: "site" },
    { label: "연락처", desc: "전화 · 이메일 · 주소", done: contactRequiredFilled, target: "contact" },
    { label: "교회 소개", desc: "담임목사 인사 등 필수 항목", done: aboutFilled, target: "page:about" },
    { label: "예배 안내", desc: "예배 시간표 1개 이상", done: worshipFilled, target: "page:worship" },
  ];
  const requiredDoneCount = requiredSteps.filter((s) => s.done).length;

  // 온보딩을 끝낸(첫 오픈 = first_published_at not null) 교회만 '시작하기'에서 기본 정보로 이동.
  useEffect(() => {
    if (loaded && onboardingDone && activeSection === "start") setActiveSection("site");
  }, [loaded, onboardingDone, activeSection]);

  // 시작하기 화면: 처음 진입 시(및 저장으로 어떤 단계든 완료 상태가 바뀔 때마다)
  // 가장 빠른 미완료 단계만 펼친다. 완료된 단계는 닫히고 다음 미완료 단계가 열린다.
  // 완료 플래그가 바뀔 때만 동작하므로, 사용자가 수동으로 펼친 단계는 영향받지 않는다.
  useEffect(() => {
    if (!loaded) return;
    const next: SectionKey | null = !siteRequiredFilled
      ? "site"
      : !contactRequiredFilled
        ? "contact"
        : !aboutFilled
          ? ("page:about" as SectionKey)
          : !worshipFilled
            ? ("page:worship" as SectionKey)
            : null;
    setOpenStep(next);
  }, [loaded, siteRequiredFilled, contactRequiredFilled, aboutFilled, worshipFilled]);

  useEffect(() => {
    if (!loaded) return;
    if (slugLocked) {
      // 이미 발급된 서브도메인은 변경 불가하므로 중복확인이 불필요하다.
      // (관리자는 교회 소유자가 아니라 check-slug 가 'taken' 으로 떠 저장이 막히던 문제 방지)
      setSlugCheck("available");
      return;
    }
    if (!trimmedSlug) {
      setSlugCheck("idle");
      return;
    }
    let cancelled = false;
    setSlugCheck("checking");
    const t = setTimeout(async () => {
      try {
        const res = await onchurchChurch.checkSlug(trimmedSlug);
        if (cancelled) return;
        setSlugCheck(res.available ? "available" : "taken");
      } catch {
        if (!cancelled) setSlugCheck("idle");
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmedSlug, loaded, slugLocked]);

  function onPickFile() {
    fileRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoErr("이미지 파일만 업로드할 수 있습니다.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setLogoErr("");
    setLogoUploading(true);
    try {
      const [uploaded] = await uploadImages([file]);
      if (uploaded?.url) setLogoPreview(uploaded.url);
    } catch (err) {
      setLogoErr(err instanceof ApiError ? err.message : "로고 업로드에 실패했습니다.");
    } finally {
      setLogoUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function clearLogo() {
    setLogoPreview(null);
    setLogoErr("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function persistEnabledPages(nextBoards: Record<string, boolean>) {
    if (!churchExistsOnServer || !slug.trim() || !name.trim()) return;
    const enabledPages = Object.entries(nextBoards).filter(([, on]) => on).map(([id]) => id);
    try {
      await onchurchChurch.upsertMine({
        slug,
        name,
        eng: eng || null,
        tagline: tagline || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        representative: null,
        businessNo: null,
        logoUrl: logoPreview || null,
        youtubeUrl: youtubeUrl?.trim() || null,
        instagramUrl: instagramUrl?.trim() || null,
        liveUrl: liveUrl?.trim() || null,
        isLive,
        enabledPages,
        homeQuickLinks,
        homeSectionOrder,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearTokens();
        router.push("/login");
      }
      // 다른 오류는 조용히 무시 — 다음 명시적 저장 시 재시도
    }
  }

  // 라이브 방송 설정(라이브 영상 URL + ON/OFF) 저장. 말씀 섹션에서 사용.
  async function persistLive(nextLiveUrl: string | null, nextIsLive: boolean) {
    setLiveUrl(nextLiveUrl);
    setIsLive(nextIsLive);
    if (!churchExistsOnServer || !slug.trim() || !name.trim()) {
      setSaveMsg("먼저 교회 기본 정보를 저장해주세요.");
      return;
    }
    const enabledPages = Object.entries(boards).filter(([, on]) => on).map(([id]) => id);
    setLiveSaving(true);
    try {
      await onchurchChurch.upsertMine({
        slug,
        name,
        eng: eng || null,
        tagline: tagline || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        representative: null,
        businessNo: null,
        logoUrl: logoPreview || null,
        youtubeUrl: youtubeUrl?.trim() || null,
        instagramUrl: instagramUrl?.trim() || null,
        liveUrl: nextLiveUrl?.trim() || null,
        isLive: nextIsLive,
        enabledPages,
        homeQuickLinks,
        homeSectionOrder,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearTokens();
        router.push("/login");
      }
    } finally {
      setLiveSaving(false);
    }
  }

  async function persistHomeSectionOrder(nextOrder: HomeSectionKey[]) {
    setHomeSectionOrder(nextOrder);
    if (!churchExistsOnServer || !slug.trim() || !name.trim()) return;
    const enabledPages = Object.entries(boards).filter(([, on]) => on).map(([id]) => id);
    try {
      await onchurchChurch.upsertMine({
        slug,
        name,
        eng: eng || null,
        tagline: tagline || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        representative: null,
        businessNo: null,
        logoUrl: logoPreview || null,
        youtubeUrl: youtubeUrl?.trim() || null,
        instagramUrl: instagramUrl?.trim() || null,
        liveUrl: liveUrl?.trim() || null,
        isLive,
        enabledPages,
        homeQuickLinks,
        homeSectionOrder: nextOrder,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearTokens();
        router.push("/login");
      }
    }
  }

  async function persistHomeQuickLinks(nextKeys: string[]) {
    setHomeQuickLinks(nextKeys);
    if (!churchExistsOnServer || !slug.trim() || !name.trim()) return;
    const enabledPages = Object.entries(boards).filter(([, on]) => on).map(([id]) => id);
    try {
      await onchurchChurch.upsertMine({
        slug,
        name,
        eng: eng || null,
        tagline: tagline || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        representative: null,
        businessNo: null,
        logoUrl: logoPreview || null,
        youtubeUrl: youtubeUrl?.trim() || null,
        instagramUrl: instagramUrl?.trim() || null,
        liveUrl: liveUrl?.trim() || null,
        isLive,
        enabledPages,
        homeQuickLinks: nextKeys,
        homeSectionOrder,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearTokens();
        router.push("/login");
      }
    }
  }

  // 페이지를 끄면, 그 페이지를 가리키던 홈 바로가기를 빼고
  // 대신 켜져 있는 다른 페이지 하나를 자동으로 채운 뒤 관리자에게 알린다.
  function syncQuickLinksAfterPageOff(pageId: string, nextBoards: Record<string, boolean>) {
    const removed = QUICK_LINK_DEFS.find((d) => d.kind === "page" && d.pageId === pageId);
    if (!removed) return;
    const effective = homeQuickLinks.length ? homeQuickLinks : [...DEFAULT_QUICK_LINK_KEYS];
    if (!effective.includes(removed.key)) return;

    const remaining = effective.filter((k) => k !== removed.key);
    const replacement = QUICK_LINK_DEFS.find(
      (d) => d.kind === "page" && d.pageId != null && (nextBoards[d.pageId] ?? true) && !remaining.includes(d.key),
    );
    const set = new Set(replacement ? [...remaining, replacement.key] : remaining);
    const nextKeys = QUICK_LINK_DEFS.filter((d) => set.has(d.key)).map((d) => d.key);
    void persistHomeQuickLinks(nextKeys);

    const msg = replacement
      ? `‘${removed.title}’ 페이지를 꺼서 홈 바로가기에서 빼고 ‘${replacement.title}’를 추가했어요.`
      : `‘${removed.title}’ 페이지를 꺼서 홈 바로가기에서 제외했어요.`;
    setQuickLimitMsg(msg);
    window.setTimeout(() => setQuickLimitMsg(""), 3600);
  }

  function toggleBoard(id: string) {
    if (id === "about") return;
    const willTurnOff = !!boards[id];
    setBoards((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      void persistEnabledPages(next);
      return next;
    });
    if (willTurnOff) syncQuickLinksAfterPageOff(id, { ...boards, [id]: false });
  }

  function setAboutSubSection(key: "vision" | "history" | "staff", on: boolean) {
    setBoards((prev) => {
      const next = { ...prev, [`about-${key}`]: on };
      void persistEnabledPages(next);
      return next;
    });
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!trimmedSlug || !name.trim()) {
      setSave("error");
      setSaveMsg("서브도메인과 교회 이름은 필수로 입력해야 합니다.");
      setActiveSection("site");
      return;
    }
    if (slugCheck === "taken") {
      setSave("error");
      setSaveMsg("이미 사용 중인 서브도메인입니다. 다른 값을 입력해주세요.");
      setActiveSection("site");
      return;
    }
    setSave("saving");
    setSaveMsg("");
    try {
      const enabledPages = Object.entries(boards)
        .filter(([, on]) => on)
        .map(([id]) => id);

      const updated = await onchurchChurch.upsertMine({
        slug,
        name,
        eng: eng || null,
        tagline: tagline || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        representative: null,
        businessNo: null,
        logoUrl: logoPreview || null,
        youtubeUrl: youtubeUrl?.trim() || null,
        instagramUrl: instagramUrl?.trim() || null,
        liveUrl: liveUrl?.trim() || null,
        isLive,
        enabledPages,
        homeQuickLinks,
        homeSectionOrder,
      });
      setIsPublished(updated.isPublished);
      setChurchExistsOnServer(true);
      setSavedRequired({
        slug,
        name,
        phone: phone || "",
        email: email || "",
        address: address || "",
      });
      setSave("saved");
      setSaveToast("변경사항이 저장되었습니다.");
      setTimeout(() => setSaveToast(""), 2500);
      setTimeout(() => setSave("idle"), 2000);
      // 온보딩(시작하기) 화면에서 저장하면, 방금 완료한 단계는 닫고 다음 미완료 단계를 펼친다.
      if (activeSection === "start") {
        const nowSite = !!slug.trim() && !!name.trim();
        const nowContact = !!phone.trim() && !!email.trim() && !!address.trim();
        const nextStep: SectionKey | null = !nowSite
          ? "site"
          : !nowContact
            ? "contact"
            : !aboutFilled
              ? ("page:about" as SectionKey)
              : !worshipFilled
                ? ("page:worship" as SectionKey)
                : null;
        setOpenStep(nextStep);
      }
    } catch (err) {
      setSave("error");
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearTokens();
          router.push("/login");
          return;
        }
        setSaveMsg(err.message);
      } else {
        setSaveMsg("저장에 실패했습니다.");
      }
    }
  }

  function onLogout() {
    clearTokens();
    router.push("/login");
  }

  // 홈페이지 버튼 클릭. 사이트 운영이 OFF면 이동을 막고 안내한다.
  // 모바일은 설정 페이지로 이동(거기서 켤 수 있음), 데스크톱은 안내만(헤더 토글이 바로 보임).
  function onClickGoHome(e: React.MouseEvent, mobile: boolean) {
    if (!isPublished) {
      e.preventDefault();
      setPublishHint(
        !allRequiredFilled
          ? "필수 단계를 모두 완료하면 사이트 운영을 켤 수 있어요."
          : mobile
            ? "사이트 운영을 켜야 홈페이지가 공개돼요. 설정에서 켜주세요."
            : "사이트 운영을 켜야 홈페이지가 공개돼요. 우측 상단 토글로 켜주세요.",
      );
      setTimeout(() => setPublishHint(""), 3200);
      if (mobile) { setActiveSection("settings"); setMobileDetail(false); }
      return;
    }
    if (slug.trim()) saveSessionChurch(slug.trim());
  }

  // 공개/비공개 토글. 처리 후 최종 공개 여부를 반환한다(시작하기의 '사이트 오픈'에서 사용).
  async function onTogglePublish(): Promise<boolean> {
    if (publishLoading) return isPublished;
    const target = !isPublished;

    if (target) {
      if (!churchExistsOnServer || !allRequiredFilled) {
        setModal("required");
        return false;
      }
      // 첫 publish 시 서버가 자동으로 7일 무료 체험을 부여하므로 클라이언트에선 차단하지 않음.
      // 체험/결제가 모두 만료된 재publish 만 차단.
      if (!subscription?.isActive && subscription?.freeTrialUntil) {
        setModal("payment");
        return false;
      }
    }

    setPublishLoading(true);
    try {
      const updated = await onchurchChurch.publish(target);
      setIsPublished(updated.church.isPublished);
      setOnboardingDone(!!updated.church.firstPublishedAt);
      setSubscription(updated.subscription);
      if (target && updated.subscription.freeTrialUntil) {
        const end = new Date(updated.subscription.freeTrialUntil);
        const yyyy = end.getFullYear();
        const mm = String(end.getMonth() + 1).padStart(2, "0");
        const dd = String(end.getDate()).padStart(2, "0");
        setTrialEndDateLabel(`${yyyy}년 ${mm}월 ${dd}일`);
        setModal("trial-started");
      }
      return updated.church.isPublished;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearTokens();
          router.push("/login");
          return false;
        }
        if (err.code === "ONCHURCH-CHURCH-003" || err.code === "ONCHURCH-CHURCH-002") {
          setModal("required");
          return false;
        }
        if (err.code === "ONCHURCH-CHURCH-004" || err.status === 402) {
          setModal("payment");
          return false;
        }
        alert(err.message);
      } else {
        alert("사이트 운영 상태 변경에 실패했습니다.");
      }
      return false;
    } finally {
      setPublishLoading(false);
    }
  }

  // 시작하기 맨 아래 '사이트 오픈' — 필수 4단계 완료 후 공개 + 홈 새 탭 + 기본 정보로 이동.
  async function onOpenSite() {
    if (!allRequiredFilled || publishLoading) return;
    const ok = isPublished ? true : await onTogglePublish();
    if (!ok) return; // 공개 실패(결제/필수 모달 등) 시 중단
    if (slug.trim()) saveSessionChurch(slug.trim());
    if (typeof window !== "undefined") window.open(previewHref, "_blank", "noopener,noreferrer");
    setActiveSection("site");
  }

  const activePage = activeSection.startsWith("page:") ? activeSection.slice(5) : null;
  const activePageItem = activePage ? initial.nav.find((n) => n.id === activePage) : null;

  // 메인 교회 폼(기본정보·연락처·로고)을 편집하는 섹션에만 개별로 넣는 저장 버튼.
  const sectionSaveBar = (
    <div className="admin-savebar">
      <div className="admin-savebar-msg">
        {save === "error" && saveMsg && <span className="phone-msg phone-msg-error">{saveMsg}</span>}
      </div>
      <div className="admin-savebar-actions">
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={save === "saving" || !loaded || !trimmedSlug || !name.trim() || slugCheck === "taken" || slugCheck === "checking"}
        >
          {save === "saving" ? "저장 중..." : "변경사항 저장"}
        </button>
      </div>
    </div>
  );

  // 시작하기 아코디언의 각 단계 패널 — '딱 기본 필수값'만 입력.
  const stepPanelContent = (target: SectionKey) => {
    if (target === "site") {
      return (
        <>
          <div className="form-row full">
            <label htmlFor="ob-slug">
              서브도메인 <span className="required-mark" aria-hidden="true">*</span>
            </label>
            <div className={`slug-input${slugLocked ? " slug-input-locked" : ""}`}>
              <span className="slug-prefix">https://</span>
              <input
                id="ob-slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  if (slugLocked) return;
                  setSlug(e.target.value.replace(/[^a-z0-9-]/g, "").slice(0, 30));
                }}
                required
                readOnly={slugLocked}
                aria-readonly={slugLocked}
              />
              <span className="slug-suffix">.everychurch.co.kr</span>
            </div>
            {!slugLocked && trimmedSlug && (
              <span className={`form-hint slug-check slug-check-${slugCheck}`} aria-live="polite" style={{ marginTop: 2 }}>
                {slugCheck === "checking" && "확인 중..."}
                {slugCheck === "available" && "✓ 사용 가능한 서브도메인입니다."}
                {slugCheck === "taken" && "✕ 이미 사용 중인 서브도메인입니다."}
              </span>
            )}
          </div>
          <div className="form-row full">
            <label htmlFor="ob-name">
              교회 이름 (한글) <span className="required-mark" aria-hidden="true">*</span>
            </label>
            <input id="ob-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="온교회" required />
          </div>
          {sectionSaveBar}
        </>
      );
    }
    if (target === "contact") {
      return (
        <>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="ob-phone">전화번호 <span className="required-mark" aria-hidden="true">*</span></label>
              <input id="ob-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-1234-5678" required />
            </div>
            <div className="form-row">
              <label htmlFor="ob-email">이메일 <span className="required-mark" aria-hidden="true">*</span></label>
              <input id="ob-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@onchurch.kr" required />
            </div>
            <div className="form-row full">
              <label htmlFor="ob-address">주소 <span className="required-mark" aria-hidden="true">*</span></label>
              <AddressPicker id="ob-address" value={address} onChange={setAddress} placeholder="서울특별시 강남구 테헤란로 ..." required churchName={name} />
            </div>
          </div>
          {sectionSaveBar}
        </>
      );
    }
    if (target === "page:about") return <OnboardPastorName onChanged={refreshRequiredStatus} />;
    if (target === "page:worship") return <OnboardFirstWorship onChanged={refreshRequiredStatus} />;
    return null;
  };

  return (
    <div className="admin-shell">
      {quickLimitMsg && (
        <div
          role="alert"
          style={{
            position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 2000,
            background: "var(--primary-deep)", color: "#fff", padding: "12px 20px", borderRadius: 999,
            fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 24px oklch(0 0 0 / 0.25)",
          }}
        >
          {quickLimitMsg}
        </div>
      )}
      {saveToast && (
        <div
          role="status"
          style={{
            position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 2000,
            background: "oklch(0.52 0.13 145)", color: "#fff", padding: "12px 20px", borderRadius: 999,
            fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 24px oklch(0 0 0 / 0.25)",
            display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden="true">✓</span>
          {saveToast}
        </div>
      )}
      {publishHint && (
        <div
          role="status"
          style={{
            position: "fixed", left: "50%", bottom: 88, transform: "translateX(-50%)", zIndex: 2000,
            background: "oklch(0.6 0.16 50)", color: "#fff", padding: "12px 18px", borderRadius: 16,
            fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 24px oklch(0 0 0 / 0.25)",
            display: "inline-flex", alignItems: "center", gap: 8, maxWidth: "calc(100vw - 32px)",
          }}
        >
          <span aria-hidden="true">⚠️</span>
          {publishHint}
        </div>
      )}
      <header className={`admin-topbar ${onboardingDone ? "onboarded" : ""}`}>
        <div className="admin-topbar-inner">
          <Link
            href="/admin"
            className="brand"
            onClick={(e) => {
              // 새로고침 없이 첫 화면으로 리셋: 홈 그룹 + 모바일은 메뉴 목록(상세에 있더라도 빠져나온다).
              e.preventDefault();
              setNavGroup("home");
              setMobileDetail(false);
              setActiveSection(onboardingDone ? "site" : "start");
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/everychurch-logo.jpeg" alt="온교회" className="brand-logo" />
            <div className="brand-text">
              <div className="brand-name">관리자 콘솔</div>
              <div className="brand-eng">ONCHURCH ADMIN</div>
            </div>
          </Link>
          <div className="admin-topbar-actions">
            <SubscriptionBadge subscription={subscription} />
            {/* 시작하기(온보딩) 화면에서는 사이트 운영 토글·홈페이지 바로가기를 숨긴다. */}
            {activeSection !== "start" && (
              <>
                <div className="admin-publish-toggle" aria-live="polite">
                  <span className="admin-publish-toggle-label">
                    <span className="admin-action-label">사이트 운영</span>
                    <span className={`admin-publish-state ${isPublished ? "on" : "off"}`}>
                      {isPublished ? "ON" : !allRequiredFilled ? "🔒 OFF" : "OFF"}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={`toggle ${isPublished ? "on" : ""}`}
                    onClick={onTogglePublish}
                    disabled={!loaded || publishLoading}
                    aria-label="사이트 운영 토글"
                    aria-pressed={isPublished}
                    title={
                      isPublished
                        ? "클릭하면 사이트를 비공개로 전환합니다"
                        : allRequiredFilled
                          ? "클릭하면 사이트를 공개합니다"
                          : `필수 ${4 - requiredDoneCount}단계를 완료하면 공개할 수 있어요`
                    }
                  />
                </div>
                <Link
                  href={previewHref}
                  className="btn btn-secondary"
                  target="_blank"
                  onClick={(e) => onClickGoHome(e, false)}
                >
                  <Icon.arrow style={{ width: 14, height: 14 }} />
                  <span className="admin-action-label">홈페이지 바로가기</span>
                  <span className="admin-action-label-mobile">홈페이지</span>
                </Link>
              </>
            )}
          </div>
          {/* 모바일: 로그아웃 자리에 홈페이지 이동 버튼(온보딩 완료 후). 로그아웃은 바텀 '설정' 탭으로 이동. */}
          {onboardingDone && (
            <Link
              href={previewHref}
              className="btn btn-secondary admin-topbar-home-mobile"
              target="_blank"
              onClick={(e) => onClickGoHome(e, true)}
            >
              <Icon.arrow style={{ width: 14, height: 14 }} />
              홈페이지
            </Link>
          )}
          <button type="button" className="btn btn-ghost admin-logout" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <main className="admin-main">
        <form onSubmit={onSave} className={`admin-layout ${onboardingDone ? "" : "admin-layout-solo"} ${activeSection === "settings" ? "settings-active" : ""} ${mobileDetail ? "mobile-detail" : ""}`}>
          {/* 첫 사이트 오픈 전(온보딩 미완료)에는 사이드바를 숨기고 시작하기 화면만 전체 폭으로 노출. */}
          {onboardingDone && (
          <aside className="admin-sidebar">
            <div className="admin-sidebar-switch">
              <button
                type="button"
                className={`btn ${navGroup === "home" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => selectNavGroup("home")}
              >
                홈페이지
              </button>
              <button
                type="button"
                className={`btn ${navGroup === "saints" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => selectNavGroup("saints")}
              >
                성도관리
                <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginLeft: 4 }}>(Beta)</span>
              </button>
            </div>

            {navGroup === "home" && (
            <>
            <div className="admin-sidebar-group">
              <div className="admin-sidebar-eyebrow">필수 설정</div>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "site" ? "active" : ""} ${siteRequiredFilled ? "is-complete" : "is-incomplete"}`}
                onClick={() => openSection("site")}
              >
                <span className="admin-sidebar-item-label">기본 정보</span>
                <span
                  className={`admin-sidebar-pill ${siteRequiredFilled ? "complete" : "incomplete"}`}
                  aria-label={siteRequiredFilled ? "필수 항목 입력 완료" : "필수 항목 미입력"}
                >
                  {siteRequiredFilled ? "필수 ✓" : "필수 미입력"}
                </span>
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "contact" ? "active" : ""} ${contactRequiredFilled ? "is-complete" : "is-incomplete"}`}
                onClick={() => openSection("contact")}
              >
                <span className="admin-sidebar-item-label">연락처</span>
                <span
                  className={`admin-sidebar-pill ${contactRequiredFilled ? "complete" : "incomplete"}`}
                  aria-label={contactRequiredFilled ? "필수 항목 입력 완료" : "필수 항목 미입력"}
                >
                  {contactRequiredFilled ? "필수 ✓" : "필수 미입력"}
                </span>
              </button>
            </div>

            <div className="admin-sidebar-group">
              <div className="admin-sidebar-eyebrow">홈 꾸미기</div>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "logo" ? "active" : ""}`}
                onClick={() => openSection("logo")}
              >
                <span className="admin-sidebar-item-label">로고</span>
                <span className="admin-sidebar-pill optional">선택</span>
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "banners" ? "active" : ""}`}
                onClick={() => openSection("banners")}
              >
                <span className="admin-sidebar-item-label">홈 배너</span>
                <span className="admin-sidebar-pill optional">선택</span>
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "home-order" ? "active" : ""}`}
                onClick={() => openSection("home-order")}
              >
                <span className="admin-sidebar-item-label">홈화면 구성</span>
                <span className="admin-sidebar-pill optional">선택</span>
              </button>
            </div>

            <div className="admin-sidebar-group">
              <div className="admin-sidebar-eyebrow">결제</div>
              <button
                type="button"
                className={`admin-sidebar-item admin-sidebar-item-billing ${activeSection === "billing" ? "active" : ""}`}
                onClick={() => openSection("billing")}
              >
                <span className="admin-sidebar-item-label">결제 · 입금 계좌</span>
                <span className="admin-sidebar-pill billing">계좌</span>
              </button>
            </div>

            {/* 주보 만들기 - 임시 숨김
            <div className="admin-sidebar-group">
              <div className="admin-sidebar-eyebrow">도구</div>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "bulletin" ? "active" : ""}`}
                onClick={() => setActiveSection("bulletin")}
              >
                <span className="admin-sidebar-item-label">주보 만들기</span>
                <span className="admin-sidebar-pill optional">PDF</span>
              </button>
            </div>
            */}

            <div className="admin-sidebar-group">
              <div className="admin-sidebar-eyebrow">도움말</div>
              <a
                href="http://pf.kakao.com/_slJXX/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-sidebar-item"
              >
                <span className="admin-sidebar-item-label">문의</span>
                <span className="admin-sidebar-pill optional">카카오톡</span>
              </a>
            </div>

            <div className="admin-sidebar-group">
              <div className="admin-sidebar-eyebrow">페이지</div>
              {initial.nav.filter((n) => n.id !== "directions").map((n) => {
                const on = boards[n.id] ?? true;
                const isActive = activeSection === `page:${n.id}`;
                const isRequired = n.id === "about" || n.id === "worship";
                const requiredFilled =
                  n.id === "about" ? aboutFilled : n.id === "worship" ? worshipFilled : false;
                const completionClass = isRequired
                  ? requiredFilled
                    ? "is-complete"
                    : "is-incomplete"
                  : "";
                return (
                  <div
                    key={n.id}
                    className={`admin-sidebar-page ${isActive ? "active" : ""} ${completionClass}`}
                  >
                    <button
                      type="button"
                      className="admin-sidebar-page-label"
                      onClick={() => openSection(`page:${n.id}` as SectionKey)}
                    >
                      <span>{n.label}</span>
                    </button>
                    {isRequired ? (
                      <span
                        className={`admin-sidebar-pill ${requiredFilled ? "complete" : "incomplete"}`}
                        aria-label={requiredFilled ? "필수 항목 입력 완료" : "필수 항목 미입력"}
                        style={{ fontSize: 10 }}
                      >
                        {requiredFilled ? "필수 ✓" : "필수 미입력"}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={`toggle ${on ? "on" : ""}`}
                        onClick={() => toggleBoard(n.id)}
                        aria-label={`${n.label} 활성화`}
                        aria-pressed={on}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            </>
            )}

            {navGroup === "saints" && (
            <div className="admin-sidebar-group">
              <div className="admin-sidebar-eyebrow">성도관리</div>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "saints-roster" ? "active" : ""}`}
                onClick={() => openSection("saints-roster")}
              >
                <span className="admin-sidebar-item-label">성도 명부</span>
                <span className="admin-sidebar-pill optional">명부</span>
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "visitations" ? "active" : ""}`}
                onClick={() => openSection("visitations")}
              >
                <span className="admin-sidebar-item-label">심방 관리</span>
                <span className="admin-sidebar-pill optional">심방</span>
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "attendance" ? "active" : ""}`}
                onClick={() => openSection("attendance")}
              >
                <span className="admin-sidebar-item-label">출석체크</span>
                <span className="admin-sidebar-pill optional">출석</span>
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "members" ? "active" : ""}`}
                onClick={() => openSection("members")}
              >
                <span className="admin-sidebar-item-label">홈페이지 회원</span>
                <span className="admin-sidebar-pill optional">계정</span>
              </button>
            </div>
            )}
          </aside>
          )}

          <div className="admin-content">
            <div className="admin-container">
              {/* 모바일 상세 화면 상단 뒤로가기 — 메뉴 목록으로 복귀. 데스크톱에서는 CSS로 숨김. */}
              <button type="button" className="admin-mobile-back" onClick={() => setMobileDetail(false)}>
                <Icon.chevL style={{ width: 18, height: 18 }} />
                뒤로
              </button>
              {/* 모바일 바텀 '설정' 탭 화면: 구독(디데이) · 사이트 운영 · 로그아웃 */}
              {activeSection === "settings" && (
                <section className="admin-section">
                  <div className="admin-section-head">
                    <div className="admin-section-eyebrow">SETTINGS</div>
                    <h2>설정</h2>
                    <p>구독 상태 확인, 사이트 공개 전환, 로그아웃을 할 수 있어요.</p>
                  </div>
                  <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="admin-settings-row">
                      <div className="admin-settings-row-label">
                        <strong>구독 상태</strong>
                        <span>남은 기간과 결제 상태입니다.</span>
                      </div>
                      <SubscriptionBadge subscription={subscription} />
                    </div>
                    <div className="admin-settings-row">
                      <div className="admin-settings-row-label">
                        <strong>사이트 운영</strong>
                        <span>{isPublished ? "방문자에게 공개 중입니다." : "현재 비공개 상태입니다."}</span>
                      </div>
                      <div className="admin-publish-toggle" aria-live="polite">
                        <span className={`admin-publish-state ${isPublished ? "on" : "off"}`}>
                          {isPublished ? "ON" : !allRequiredFilled ? "🔒 OFF" : "OFF"}
                        </span>
                        <button
                          type="button"
                          className={`toggle ${isPublished ? "on" : ""}`}
                          onClick={onTogglePublish}
                          disabled={!loaded || publishLoading}
                          aria-label="사이트 운영 토글"
                          aria-pressed={isPublished}
                        />
                      </div>
                    </div>
                    <button type="button" className="btn btn-secondary admin-settings-logout" onClick={onLogout}>
                      로그아웃
                    </button>
                  </div>
                </section>
              )}
              {activeSection === "start" && (
                <section className="admin-section">
                  <div className="admin-section-head">
                    <div className="admin-section-eyebrow">START</div>
                    <h2>{isPublished ? "사이트 운영 중" : "환영합니다 👋"}</h2>
                    <p>
                      {isPublished
                        ? "필수 설정이 완료되어 사이트가 공개되어 있습니다. 아래에서 언제든 내용을 보강하세요."
                        : "처음이라 할 게 많아 보여도 괜찮아요. 사이트 공개에 꼭 필요한 건 아래 4가지뿐입니다."}
                    </p>
                  </div>
                  <div className="admin-section-body">
                    <div className="onboard-progress">
                      <div className="onboard-progress-top">
                        <strong>사이트 공개까지 {requiredDoneCount}/4 단계</strong>
                        <span className={`onboard-progress-pill ${allRequiredFilled ? "done" : ""}`}>
                          {allRequiredFilled ? "준비 완료" : `${4 - requiredDoneCount}개 남음`}
                        </span>
                      </div>
                      <div className="onboard-progress-bar">
                        <div className="onboard-progress-fill" style={{ width: `${(requiredDoneCount / 4) * 100}%` }} />
                      </div>
                    </div>

                    <ol className="onboard-steps">
                      {requiredSteps.map((s, i) => {
                        const open = openStep === s.target;
                        return (
                          <li key={s.target} className={`onboard-step ${s.done ? "done" : ""} ${open ? "open" : ""}`}>
                            <button
                              type="button"
                              className="onboard-step-head"
                              onClick={() => setOpenStep(open ? null : s.target)}
                              aria-expanded={open}
                            >
                              <span className="onboard-step-num">{s.done ? "✓" : i + 1}</span>
                              <span className="onboard-step-body">
                                <strong>{s.label}</strong>
                                {s.desc && <span>{s.desc}</span>}
                              </span>
                              <span className="onboard-step-toggle">
                                {open ? "닫기 ▲" : s.done ? "수정 ▾" : "입력 ▾"}
                              </span>
                            </button>
                            {open && <div className="onboard-step-panel">{stepPanelContent(s.target)}</div>}
                          </li>
                        );
                      })}
                    </ol>

                    <div className={`onboard-cta ${allRequiredFilled ? "ready" : "locked"}`}>
                      <div className="onboard-cta-text">
                        {allRequiredFilled ? (
                          <>
                            <strong>이제 사이트를 오픈할 수 있어요! 🎉</strong>
                            <span>오픈하면 첫 7일 무료 체험이 시작되고 홈페이지가 새 탭으로 열립니다.</span>
                          </>
                        ) : (
                          <>
                            <strong>🔒 필수 {4 - requiredDoneCount}단계를 완료하면 오픈할 수 있어요.</strong>
                            <span>위 단계를 모두 끝내면 ‘사이트 오픈’ 버튼이 켜집니다.</span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        onClick={onOpenSite}
                        disabled={!allRequiredFilled || publishLoading}
                      >
                        {publishLoading ? "오픈 중..." : "사이트 오픈"}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "site" && (
                <section className="admin-section">
                  <div className="admin-section-head">
                    <div className="admin-section-eyebrow">SITE</div>
                    <h2>사이트 기본 정보</h2>
                    <p>방문자에게 노출되는 교회의 식별 정보입니다.</p>
                  </div>
                  {!siteRequiredFilled && (
                    <div className="admin-section-banner incomplete">
                      <span className="admin-section-banner-icon">!</span>
                      <span>
                        필수 항목 미입력 — <strong>서브도메인</strong>, <strong>교회 이름(한글)</strong>을 입력해주세요.
                      </span>
                    </div>
                  )}
                  <div className="admin-section-body">
                    <div className="form-row full">
                      <label htmlFor="ad-slug">
                        서브도메인 <span className="required-mark" aria-hidden="true">*</span>
                        {slugLocked && (
                          <a
                            className="slug-locked-badge"
                            href="mailto:hello@everychurch.co.kr?subject=서브도메인 변경 문의"
                          >
                            <span aria-hidden="true">🔒</span> 발급 완료 · 변경 시 문의 주세요
                          </a>
                        )}
                      </label>
                      <div className={`slug-input${slugLocked ? " slug-input-locked" : ""}`}>
                        <span className="slug-prefix">https://</span>
                        <input
                          id="ad-slug"
                          type="text"
                          value={slug}
                          onChange={(e) => {
                            if (slugLocked) return;
                            setSlug(e.target.value.replace(/[^a-z0-9-]/g, "").slice(0, 30));
                          }}
                          required
                          readOnly={slugLocked}
                          aria-readonly={slugLocked}
                        />
                        <span className="slug-suffix">.everychurch.co.kr</span>
                      </div>
                      {slugLocked ? (
                        <span className="form-hint">
                          서브도메인은 최초 1회만 발급되며 변경할 수 없습니다. 변경이 필요하면{" "}
                          <a href="mailto:hello@everychurch.co.kr?subject=서브도메인 변경 문의">hello@everychurch.co.kr</a>로 문의해주세요.
                        </span>
                      ) : (
                        <>
                          <span className="form-hint">영문 소문자, 숫자, 하이픈만 사용 가능 · 한 번 발급되면 변경할 수 없습니다.</span>
                          {trimmedSlug && (
                            <span
                              className={`form-hint slug-check slug-check-${slugCheck}`}
                              aria-live="polite"
                              style={{ marginTop: 2 }}
                            >
                              {slugCheck === "checking" && "확인 중..."}
                              {slugCheck === "available" && "✓ 사용 가능한 서브도메인입니다."}
                              {slugCheck === "taken" && "✕ 이미 사용 중인 서브도메인입니다."}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="form-grid">
                      <div className="form-row">
                        <label htmlFor="ad-name">
                          교회 이름 (한글) <span className="required-mark" aria-hidden="true">*</span>
                        </label>
                        <input id="ad-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="온교회" required />
                      </div>
                      <div className="form-row">
                        <label htmlFor="ad-eng">영문명</label>
                        <input id="ad-eng" type="text" value={eng} onChange={(e) => setEng(e.target.value)} placeholder="SUNGDONG CHURCH" />
                      </div>
                      <div className="form-row full">
                        <label htmlFor="ad-tagline">태그라인</label>
                        <input id="ad-tagline" type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="은혜와 진리가 흐르는 공동체" />
                      </div>
                    </div>
                    {sectionSaveBar}
                  </div>
                </section>
              )}

              {activeSection === "logo" && (
                <section className="admin-section">
                  <div className="admin-section-head">
                    <div className="admin-section-eyebrow">LOGO</div>
                    <h2>로고 이미지</h2>
                    <p>네비게이션과 풋터에 표시됩니다. 정사각형 PNG/SVG 권장 (256×256 이상).</p>
                  </div>
                  <div className="admin-section-body">
                    <div className="logo-row">
                      <div className="logo-preview">
                        {logoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoPreview} alt="logo preview" />
                        ) : (
                          <div className="logo-placeholder">
                            <Icon.image width={28} height={28} />
                            <span>로고 미리보기</span>
                          </div>
                        )}
                      </div>
                      <div className="logo-actions">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          onChange={onFileChange}
                          style={{ display: "none" }}
                        />
                        <button type="button" className="btn btn-primary" onClick={onPickFile} disabled={logoUploading}>
                          <Icon.image style={{ width: 14, height: 14 }} />
                          {logoUploading ? "업로드 중..." : logoPreview ? "이미지 변경" : "이미지 업로드"}
                        </button>
                        {logoPreview && !logoUploading && (
                          <button type="button" className="btn btn-secondary logo-remove-btn" onClick={clearLogo}>
                            제거
                          </button>
                        )}
                        {logoErr && <p className="form-hint" style={{ marginTop: 4, color: "oklch(0.55 0.18 28)" }}>{logoErr}</p>}
                        <p className="form-hint" style={{ marginTop: 4 }}>JPG/PNG/SVG. 정사각형 권장 (256×256 이상).</p>
                      </div>
                    </div>
                    <div className="logo-presets">
                      <div className="logo-presets-label">또는 교단 로고에서 선택</div>
                      <div className="logo-presets-grid">
                        {DENOMINATION_LOGOS.map((p) => {
                          const selected = logoPreview === p.url;
                          return (
                            <button
                              type="button"
                              key={p.url}
                              className={`logo-preset ${selected ? "selected" : ""}`}
                              onClick={() => { setLogoPreview(p.url); setLogoErr(""); }}
                              aria-pressed={selected}
                              aria-label={p.label}
                            >
                              <div className="logo-preset-img">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.url} alt="" />
                              </div>
                              <span className="logo-preset-name">{p.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {sectionSaveBar}
                  </div>
                </section>
              )}

              {activeSection === "contact" && (
                <section className="admin-section">
                  <div className="admin-section-head">
                    <div className="admin-section-eyebrow">CONTACT</div>
                    <h2>교회 연락처</h2>
                    <p>풋터와 &quot;찾아오시는 길&quot; 페이지에 사용됩니다.</p>
                  </div>
                  {!contactRequiredFilled && (
                    <div className="admin-section-banner incomplete">
                      <span className="admin-section-banner-icon">!</span>
                      <span>
                        필수 항목 미입력 —
                        {!phone.trim() && " 전화번호"}
                        {!email.trim() && " 이메일"}
                        {!address.trim() && " 주소"}
                        {" "}을 입력해주세요.
                      </span>
                    </div>
                  )}
                  <div className="admin-section-body">
                    <div className="form-grid">
                      <div className="form-row">
                        <label htmlFor="ad-phone">
                          전화번호 <span className="required-mark" aria-hidden="true">*</span>
                        </label>
                        <input id="ad-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-1234-5678" required />
                      </div>
                      <div className="form-row">
                        <label htmlFor="ad-email">
                          이메일 <span className="required-mark" aria-hidden="true">*</span>
                        </label>
                        <input id="ad-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@onchurch.kr" required />
                      </div>
                      <div className="form-row full">
                        <label htmlFor="ad-address">
                          주소 <span className="required-mark" aria-hidden="true">*</span>
                        </label>
                        <AddressPicker
                          id="ad-address"
                          value={address}
                          onChange={setAddress}
                          placeholder="서울특별시 강남구 테헤란로 ..."
                          required
                          churchName={name}
                        />
                      </div>
                      <div className="form-row full">
                        <label htmlFor="ad-youtube-channel">유튜브 채널 주소</label>
                        <input
                          id="ad-youtube-channel"
                          type="url"
                          value={youtubeUrl ?? ""}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="https://www.youtube.com/@yourchurch"
                        />
                        <p className="form-hint">입력하면 홈 메인 빠른 이동에 &lsquo;유튜브&rsquo; 바로가기가 노출됩니다. 비워두면 숨겨집니다. (실시간 방송은 말씀 메뉴에서 설정)</p>
                      </div>
                      <div className="form-row full">
                        <label htmlFor="ad-instagram">인스타그램 주소</label>
                        <input
                          id="ad-instagram"
                          type="url"
                          value={instagramUrl ?? ""}
                          onChange={(e) => setInstagramUrl(e.target.value)}
                          placeholder="https://www.instagram.com/yourchurch"
                        />
                        <p className="form-hint">입력하면 홈 바로가기에 &lsquo;인스타그램&rsquo;을 추가할 수 있습니다. (홈 구성 메뉴에서 노출 항목 선택)</p>
                      </div>
                    </div>
                    {sectionSaveBar}
                    <DirectionsEditor />
                  </div>
                </section>
              )}

              {activeSection === "banners" && <BannersEditor />}

              {activeSection === "home-order" && (
                <HomeOrderEditor
                  order={homeSectionOrder}
                  activeKeys={(() => {
                    const keys: HomeSectionKey[] = ["banner"];
                    if (boards["schedule"]) keys.push("events");
                    if (
                      boards["worship"] || boards["sermons"] || boards["gallery"] || boards["directions"] ||
                      boards["notices"] || boards["schedule"] || boards["community"] ||
                      youtubeUrl?.trim() || instagramUrl?.trim()
                    ) keys.push("quick");
                    if (boards["worship"]) keys.push("worship");
                    if (boards["sermons"]) keys.push("sermons");
                    keys.push("visit", "pastor");
                    return keys;
                  })()}
                  onChange={(next) => void persistHomeSectionOrder(next)}
                />
              )}

              {activeSection === "home-order" && (() => {
                const MAX_QUICK = 4;
                const selected = homeQuickLinks.length ? homeQuickLinks : DEFAULT_QUICK_LINK_KEYS;
                const isSel = (k: string) => selected.includes(k);
                const showQuickToast = (m: string) => {
                  setQuickLimitMsg(m);
                  window.setTimeout(() => setQuickLimitMsg(""), 2800);
                };
                const toggle = (k: string) => {
                  const set = new Set(selected);
                  if (set.has(k)) {
                    set.delete(k);
                  } else {
                    const def = QUICK_LINK_DEFS.find((d) => d.key === k);
                    // 유튜브/인스타는 주소가 없으면 선택 불가 — 연락처 메뉴에서 먼저 입력하도록 안내
                    if (def?.kind === "external") {
                      const hasUrl = def.external === "youtube" ? !!youtubeUrl?.trim() : !!instagramUrl?.trim();
                      if (!hasUrl) {
                        showQuickToast(`${def.title} 주소가 없습니다. ‘연락처’ 메뉴에서 ${def.title} 주소를 먼저 입력해주세요.`);
                        return;
                      }
                    }
                    if (set.size >= MAX_QUICK) {
                      showQuickToast(`바로가기는 최대 ${MAX_QUICK}개까지만 선택할 수 있습니다.`);
                      return;
                    }
                    set.add(k);
                  }
                  const next = QUICK_LINK_DEFS.filter((d) => set.has(d.key)).map((d) => d.key);
                  void persistHomeQuickLinks(next);
                };
                const availability = (key: string): string => {
                  const def = QUICK_LINK_DEFS.find((d) => d.key === key);
                  if (!def) return "";
                  if (def.kind === "external") {
                    const has = def.external === "youtube" ? !!youtubeUrl?.trim() : !!instagramUrl?.trim();
                    return has ? "" : (def.external === "youtube" ? "유튜브 주소 입력 필요" : "인스타그램 주소 입력 필요");
                  }
                  return def.pageId && boards[def.pageId] ? "" : "페이지를 켜야 노출";
                };
                return (
                  <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
                    <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>홈 바로가기 <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 400 }}>(최대 {MAX_QUICK}개 · {selected.length}/{MAX_QUICK})</span></h3>
                    <p className="form-hint" style={{ marginBottom: 14 }}>
                      홈 메인에 노출할 바로가기 항목을 최대 {MAX_QUICK}개까지 선택하세요. 선택해도 해당 페이지가 꺼져 있거나 URL이 없으면 노출되지 않습니다.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {QUICK_LINK_DEFS.map((d) => {
                        const sel = isSel(d.key);
                        const note = availability(d.key);
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => toggle(d.key)}
                            className="admin-banner-card"
                            style={{ textAlign: "left", cursor: "pointer", borderColor: sel ? "var(--accent)" : undefined }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                                display: "grid", placeItems: "center", fontSize: 12, color: "#fff",
                                background: sel ? "var(--accent)" : "transparent",
                                border: `1.5px solid ${sel ? "var(--accent)" : "var(--line)"}`,
                              }}
                            >
                              {sel ? "✓" : ""}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <strong>{d.title}</strong>
                                {note && <span style={{ color: "var(--muted)", fontSize: 11.5 }}>· {note}</span>}
                              </div>
                              <div style={{ color: "var(--muted)", fontSize: 12 }}>{d.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {activeSection === "billing" && (
                <section className="admin-section">
                  <div className="admin-section-head">
                    <div className="admin-section-eyebrow">BILLING</div>
                    <h2>결제 · 입금 계좌</h2>
                    <p>아래 계좌로 입금해주시면 사이트 운영이 연장됩니다.</p>
                  </div>
                  <div className="admin-section-body">
                    <PaymentAccountCard />
                  </div>
                </section>
              )}

              {/* 주보 만들기 - 임시 숨김
              {activeSection === "bulletin" && <BulletinEditor />}
              */}


              {activeSection === "members" && <MembersEditor />}

              {activeSection === "saints-roster" && <SaintsEditor />}

              {activeSection === "visitations" && <VisitationsEditor />}

              {activeSection === "attendance" && <AttendanceEditor />}

              {activePage && activePageItem && (
                <div className="admin-page-editor">
                  <div className="admin-page-editor-head">
                    <div className="admin-section-eyebrow">PAGE</div>
                    <h1>{activePageItem.label}</h1>
                    <p>
                      {BOARD_DESCRIPTIONS[activePage] ?? activePageItem.href} · 좌측 토글로 이 페이지의 노출 여부를 제어할 수 있습니다.
                    </p>
                  </div>

                  {activePage === "worship" && (
                    <WorshipEditor onChanged={refreshRequiredStatus} />
                  )}

                  {activePage === "notices" && <NoticesEditor />}

                  {activePage === "schedule" && <ScheduleEditor />}

                  {activePage === "about" && (
                    <AboutEditor
                      visibility={{
                        vision: boards["about-vision"] ?? true,
                        history: boards["about-history"] ?? true,
                        staff: boards["about-staff"] ?? true,
                      }}
                      onToggleVisibility={setAboutSubSection}
                      onChanged={refreshRequiredStatus}
                    />
                  )}

                  {activePage === "sermons" && (
                    <SermonsEditor
                      live={{
                        liveUrl,
                        isLive,
                        saving: liveSaving,
                        onChangeUrl: (u) => setLiveUrl(u),
                        onPersist: persistLive,
                      }}
                    />
                  )}

                  {activePage === "gallery" && <GalleryEditor />}

                  {activePage === "community" && <CommunityEditor />}

                  {activePage === "prayer" && <PrayerEditor />}

                  {activePage !== "worship" &&
                    activePage !== "notices" &&
                    activePage !== "schedule" &&
                    activePage !== "about" &&
                    activePage !== "sermons" &&
                    activePage !== "gallery" &&
                    activePage !== "community" &&
                    activePage !== "prayer" && (
                      <section className="admin-section admin-section-empty">
                        <div className="admin-section-head">
                          <h2>설정 준비 중</h2>
                          <p>이 페이지의 상세 설정 폼은 곧 추가됩니다. 지금은 사이드바의 토글로 페이지 노출 여부만 변경할 수 있습니다.</p>
                        </div>
                      </section>
                    )}
                </div>
              )}

            </div>
          </div>
        </form>
      </main>

      {/* 모바일 전용 바텀 네비게이션 (온보딩 완료 후). 데스크톱에서는 CSS로 숨김. */}
      {onboardingDone && (
        <nav className="admin-bottom-nav" aria-label="모바일 메뉴">
          <button
            type="button"
            className={`admin-bottom-nav-item ${activeSection !== "settings" && navGroup === "home" ? "active" : ""}`}
            onClick={() => selectNavGroup("home")}
          >
            <Icon.home />
            <span>홈페이지 설정</span>
          </button>
          <button
            type="button"
            className={`admin-bottom-nav-item ${activeSection !== "settings" && navGroup === "saints" ? "active" : ""}`}
            onClick={() => selectNavGroup("saints")}
          >
            <Icon.users />
            <span>성도관리</span>
          </button>
          <button
            type="button"
            className={`admin-bottom-nav-item ${activeSection === "settings" ? "active" : ""}`}
            onClick={() => { setActiveSection("settings"); setMobileDetail(false); }}
          >
            <Icon.gear />
            <span>설정</span>
          </button>
        </nav>
      )}

      {modal && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setModal(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            {modal === "required" ? (
              <>
                <h3 className="admin-modal-title">필수 정보가 부족합니다</h3>
                <p className="admin-modal-body">
                  필수 항목(<strong>기본정보</strong>·<strong>연락처</strong>·<strong>교회 소개</strong>·<strong>예배 안내</strong>)이 모두 입력되어야 사이트를 운영할 수 있습니다.
                </p>
                <div className="admin-modal-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>
                    닫기
                  </button>
                </div>
              </>
            ) : modal === "payment" ? (
              <>
                <h3 className="admin-modal-title">결제가 필요합니다</h3>
                <p className="admin-modal-body">
                  무료 체험이 종료되었거나 결제 정보가 없습니다. 아래 계좌로 입금해주시면 사이트 운영이 연장됩니다.
                </p>
                <PaymentAccountCard />
                <div className="admin-modal-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>
                    확인
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="admin-modal-title">🎉 사이트 운영이 시작되었습니다</h3>
                <p className="admin-modal-body">
                  <strong>7일 무료 체험</strong>이 시작되었습니다.<br />
                  종료일: <strong>{trialEndDateLabel}</strong><br />
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>
                    체험 기간 동안 모든 기능을 자유롭게 사용해보세요. 종료 전에 결제하시면 끊김 없이 이어집니다.
                  </span>
                </p>
                <div className="admin-modal-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>
                    확인
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
