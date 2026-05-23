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
  onchurchChurch,
  onchurchPastor,
  onchurchWorshipService,
  uploadImages,
  type Subscription,
} from "@/lib/api-client";
import { WorshipEditor } from "./page-editors/worship";
import { NoticesEditor } from "./page-editors/notices";
import { ScheduleEditor } from "./page-editors/schedule";
import { AboutEditor } from "./page-editors/about";
import { DirectionsEditor } from "./page-editors/directions";
import { GalleryEditor } from "./page-editors/gallery";
import { BannersEditor } from "./page-editors/banners";
import { SermonsEditor } from "./page-editors/sermons";
import { PrayerEditor } from "./page-editors/prayer";
import { InquiryEditor } from "./page-editors/inquiry";

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
  about: "담임목사 인사 · 비전 · 연혁 · 교역자",
  worship: "주일/수요/새벽 예배 안내 · 예배 순서",
  sermons: "설교 영상 · 카테고리 필터",
  notices: "공지사항",
  schedule: "행사 캘린더 · 다가오는 일정",
  departments: "유아부부터 청년부까지 · 소그룹",
  prayer: "기도 요청 폼 · 익명 옵션",
  gallery: "사진 갤러리",
  bible: "성경 통독 · QT 가이드",
};

type SectionKey = "site" | "logo" | "contact" | "banners" | "inquiry" | `page:${string}`;

function formatYMD(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function daysLeft(iso: string): number {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end - today.getTime()) / (24 * 60 * 60 * 1000)));
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
];

export function AdminApp({ initial }: { initial: Initial }) {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<SectionKey>("site");

  const [slug, setSlug] = useState(initial.slug);
  const [name, setName] = useState(initial.brand.name);
  const [eng, setEng] = useState(initial.brand.eng);
  const [tagline, setTagline] = useState(initial.brand.tagline);
  const [phone, setPhone] = useState(initial.brand.phone);
  const [email, setEmail] = useState(initial.brand.email);
  const [address, setAddress] = useState(initial.brand.address);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoErr, setLogoErr] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const ABOUT_SUB_KEYS = ["about-vision", "about-history", "about-staff"] as const;
  const WORSHIP_SUB_KEYS = ["worship-order"] as const;

  const [boards, setBoards] = useState<Record<string, boolean>>(
    () => {
      const base = Object.fromEntries(initial.nav.map((n) => [n.id, false]));
      base["about"] = true;
      base["worship"] = true;
      for (const k of ABOUT_SUB_KEYS) base[k] = false;
      for (const k of WORSHIP_SUB_KEYS) base[k] = false;
      return base;
    },
  );

  const [notices, setNotices] = useState<Notice[]>(initial.notices);
  const [noticeCategories, setNoticeCategories] = useState<string[]>(initial.noticeCategories);
  const [events, setEvents] = useState<EventItem[]>(initial.events);

  const [pastor, setPastor] = useState<Pastor>(initial.pastor);
  const [vision, setVision] = useState<VisionItem[]>(initial.vision);
  const [history, setHistory] = useState<HistoryItem[]>(initial.history);
  const [staff, setStaff] = useState<StaffMember[]>(initial.staff);

  const [save, setSave] = useState<SaveState>("idle");
  const [saveMsg, setSaveMsg] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  const [isPublished, setIsPublished] = useState(false);
  const [churchExistsOnServer, setChurchExistsOnServer] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [modal, setModal] = useState<null | "required" | "payment" | "trial-started">(null);
  const [trialEndDateLabel, setTrialEndDateLabel] = useState<string>("");

  const [aboutFilled, setAboutFilled] = useState(false);
  const [worshipFilled, setWorshipFilled] = useState(false);

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
        if (res?.church) {
          const c = res.church;
          setSlug(c.slug);
          setName(c.name);
          setEng(c.eng ?? "");
          setTagline(c.tagline ?? "");
          setPhone(c.phone ?? "");
          setEmail(c.email ?? "");
          setAddress(c.address ?? "");
          if (c.logoUrl) setLogoPreview(c.logoUrl);
          if (c.enabledPages?.length) {
            const next: Record<string, boolean> = {};
            for (const n of initial.nav) next[n.id] = c.enabledPages.includes(n.id);
            next["about"] = true;
            next["worship"] = true;
            for (const k of ABOUT_SUB_KEYS) next[k] = c.enabledPages.includes(k);
            for (const k of WORSHIP_SUB_KEYS) next[k] = c.enabledPages.includes(k);
            setBoards(next);
          }
          setIsPublished(c.isPublished);
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
  const siteRequiredFilled = !!trimmedSlug && !!name.trim() && slugCheck !== "taken";
  const contactRequiredFilled = !!phone.trim() && !!email.trim() && !!address.trim();
  const allRequiredFilled = siteRequiredFilled && contactRequiredFilled && aboutFilled && worshipFilled;

  useEffect(() => {
    if (!loaded) return;
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
  }, [trimmedSlug, loaded]);

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
        enabledPages,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearTokens();
        router.push("/login");
      }
      // 다른 오류는 조용히 무시 — 다음 명시적 저장 시 재시도
    }
  }

  function toggleBoard(id: string) {
    if (id === "about") return;
    setBoards((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      void persistEnabledPages(next);
      return next;
    });
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
        enabledPages,
      });
      setIsPublished(updated.isPublished);
      setChurchExistsOnServer(true);
      setSave("saved");
      setTimeout(() => setSave("idle"), 2000);
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

  async function onTogglePublish() {
    if (publishLoading) return;
    const target = !isPublished;

    if (target) {
      if (!churchExistsOnServer || !allRequiredFilled) {
        setModal("required");
        return;
      }
      // 첫 publish 시 서버가 자동으로 7일 무료 체험을 부여하므로 클라이언트에선 차단하지 않음.
      // 체험/결제가 모두 만료된 재publish 만 차단.
      if (!subscription?.isActive && subscription?.freeTrialUntil) {
        setModal("payment");
        return;
      }
    }

    setPublishLoading(true);
    try {
      const updated = await onchurchChurch.publish(target);
      setIsPublished(updated.church.isPublished);
      setSubscription(updated.subscription);
      if (target && updated.subscription.freeTrialUntil) {
        const end = new Date(updated.subscription.freeTrialUntil);
        const yyyy = end.getFullYear();
        const mm = String(end.getMonth() + 1).padStart(2, "0");
        const dd = String(end.getDate()).padStart(2, "0");
        setTrialEndDateLabel(`${yyyy}년 ${mm}월 ${dd}일`);
        setModal("trial-started");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearTokens();
          router.push("/login");
          return;
        }
        if (err.code === "ONCHURCH-CHURCH-003" || err.code === "ONCHURCH-CHURCH-002") {
          setModal("required");
          return;
        }
        if (err.code === "ONCHURCH-CHURCH-004" || err.status === 402) {
          setModal("payment");
          return;
        }
        alert(err.message);
      } else {
        alert("사이트 운영 상태 변경에 실패했습니다.");
      }
    } finally {
      setPublishLoading(false);
    }
  }

  const activePage = activeSection.startsWith("page:") ? activeSection.slice(5) : null;
  const activePageItem = activePage ? initial.nav.find((n) => n.id === activePage) : null;

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <Link href="/admin" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/everychurch-logo.jpeg" alt="온교회" className="brand-logo" />
            <div className="brand-text">
              <div className="brand-name">관리자 콘솔</div>
              <div className="brand-eng">ONCHURCH ADMIN</div>
            </div>
          </Link>
          <div className="admin-topbar-actions">
            <SubscriptionBadge subscription={subscription} />
            <div className="admin-publish-toggle" aria-live="polite">
              <span className="admin-publish-toggle-label">
                <span className="admin-action-label">사이트 운영</span>
                <span className={`admin-publish-state ${isPublished ? "on" : "off"}`}>
                  {isPublished ? "ON" : "OFF"}
                </span>
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
            <Link href={previewHref} className="btn btn-secondary" target="_blank">
              <Icon.arrow style={{ width: 14, height: 14 }} />
              <span className="admin-action-label">홈페이지 바로가기</span>
            </Link>
            <button type="button" className="btn btn-ghost" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <form onSubmit={onSave} className="admin-layout">
          <aside className="admin-sidebar">
            <div className="admin-sidebar-group">
              <div className="admin-sidebar-eyebrow">사이트</div>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "site" ? "active" : ""} ${siteRequiredFilled ? "is-complete" : "is-incomplete"}`}
                onClick={() => setActiveSection("site")}
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
                onClick={() => setActiveSection("contact")}
              >
                <span className="admin-sidebar-item-label">연락처</span>
                <span
                  className={`admin-sidebar-pill ${contactRequiredFilled ? "complete" : "incomplete"}`}
                  aria-label={contactRequiredFilled ? "필수 항목 입력 완료" : "필수 항목 미입력"}
                >
                  {contactRequiredFilled ? "필수 ✓" : "필수 미입력"}
                </span>
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "logo" ? "active" : ""}`}
                onClick={() => setActiveSection("logo")}
              >
                <span className="admin-sidebar-item-label">로고</span>
                <span className="admin-sidebar-pill optional">선택</span>
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "banners" ? "active" : ""}`}
                onClick={() => setActiveSection("banners")}
              >
                <span className="admin-sidebar-item-label">홈 배너</span>
                <span className="admin-sidebar-pill optional">선택</span>
              </button>
            </div>

            <div className="admin-sidebar-group">
              <div className="admin-sidebar-eyebrow">도움말</div>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "inquiry" ? "active" : ""}`}
                onClick={() => setActiveSection("inquiry")}
              >
                <span className="admin-sidebar-item-label">문의</span>
                <span className="admin-sidebar-pill optional">지원</span>
              </button>
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
                      onClick={() => setActiveSection(`page:${n.id}` as SectionKey)}
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
          </aside>

          <div className="admin-content">
            <div className="admin-container">
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
                      </label>
                      <div className="slug-input">
                        <span className="slug-prefix">https://</span>
                        <input
                          id="ad-slug"
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, "").slice(0, 30))}
                          placeholder="onchurch"
                          required
                        />
                        <span className="slug-suffix">.everychurch.co.kr</span>
                      </div>
                      <span className="form-hint">영문 소문자, 숫자, 하이픈만 사용 가능 · 한 번 발급되면 변경에 제한이 있을 수 있습니다.</span>
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
                          <button type="button" className="btn btn-ghost" onClick={clearLogo}>
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
                    </div>
                    <DirectionsEditor />
                  </div>
                </section>
              )}

              {activeSection === "banners" && <BannersEditor />}

              {activeSection === "inquiry" && <InquiryEditor />}

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
                    <WorshipEditor
                      orderVisible={boards["worship-order"] ?? true}
                      onToggleOrderVisible={(on) => setBoards((prev) => {
                        const next = { ...prev, ["worship-order"]: on };
                        void persistEnabledPages(next);
                        return next;
                      })}
                      onChanged={refreshRequiredStatus}
                    />
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

                  {activePage === "sermons" && <SermonsEditor />}

                  {activePage === "gallery" && <GalleryEditor />}

                  {activePage === "prayer" && <PrayerEditor />}

                  {activePage !== "worship" &&
                    activePage !== "notices" &&
                    activePage !== "schedule" &&
                    activePage !== "about" &&
                    activePage !== "sermons" &&
                    activePage !== "gallery" &&
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

              <div className="admin-savebar">
                <div className="admin-savebar-msg">
                  {save === "saved" && <span className="phone-msg phone-msg-success">변경사항이 저장되었습니다.</span>}
                  {save === "error" && saveMsg && <span className="phone-msg phone-msg-error">{saveMsg}</span>}
                  {save === "idle" && (
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>
                      {loaded ? "변경사항은 저장 후 적용됩니다." : "교회 정보를 불러오는 중..."}
                    </span>
                  )}
                </div>
                <div className="admin-savebar-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => router.refresh()}>
                    변경 취소
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={save === "saving" || !loaded || !trimmedSlug || !name.trim() || slugCheck === "taken" || slugCheck === "checking"}
                  >
                    {save === "saving" ? "저장 중..." : "변경사항 저장"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

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
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>
                    닫기
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setModal(null);
                      if (!siteRequiredFilled) setActiveSection("site");
                      else if (!contactRequiredFilled) setActiveSection("contact");
                      else if (!aboutFilled) setActiveSection("page:about" as SectionKey);
                      else if (!worshipFilled) setActiveSection("page:worship" as SectionKey);
                    }}
                  >
                    필수 정보 입력하기
                  </button>
                </div>
              </>
            ) : modal === "payment" ? (
              <>
                <h3 className="admin-modal-title">결제가 필요합니다</h3>
                <p className="admin-modal-body">
                  무료 체험이 종료되었거나 결제 정보가 없습니다. 사이트를 계속 운영하려면 결제를 진행해주세요.
                </p>
                <div className="admin-modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>
                    닫기
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setModal(null);
                      router.push("/billing");
                    }}
                  >
                    결제하기
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
