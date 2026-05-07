"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import type {
  Brand,
  EventItem,
  GalleryItem,
  HistoryItem,
  NavItem,
  Notice,
  Pastor,
  StaffMember,
  Transportation,
  VisionItem,
  WorshipService,
} from "@/lib/types";
import { ApiError, clearTokens, onchurchChurch, type Subscription } from "@/lib/api-client";
import { WorshipEditor } from "./page-editors/worship";
import { NoticesEditor } from "./page-editors/notices";
import { ScheduleEditor } from "./page-editors/schedule";
import { AboutEditor } from "./page-editors/about";
import { DirectionsEditor } from "./page-editors/directions";
import { GalleryEditor } from "./page-editors/gallery";
import { BannersEditor } from "./page-editors/banners";

type Initial = {
  slug: string;
  brand: Brand;
  nav: NavItem[];
  worshipServices: WorshipService[];
  worshipOrder: [string, string, string][];
  notices: Notice[];
  noticeCategories: string[];
  events: EventItem[];
  pastor: Pastor;
  vision: VisionItem[];
  history: HistoryItem[];
  staff: StaffMember[];
  transportation: Transportation[];
  galleries: GalleryItem[];
  galleryCategories: string[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

const BOARD_DESCRIPTIONS: Record<string, string> = {
  about: "담임목사 인사 · 비전 · 연혁 · 교역자",
  worship: "주일/수요/새벽 예배 안내 · 예배 순서",
  sermons: "설교 영상 · 주보 PDF · 시리즈 필터",
  notices: "공지사항",
  schedule: "행사 캘린더 · 다가오는 일정",
  departments: "유아부부터 청년부까지 · 소그룹",
  prayer: "기도 요청 폼 · 익명 옵션",
  gallery: "사진 갤러리",
  directions: "찾아오시는 길 · 지도 · 대중교통",
  bible: "성경 통독 · QT 가이드",
};

type SectionKey = "site" | "logo" | "contact" | "banners" | `page:${string}`;

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
  const fileRef = useRef<HTMLInputElement>(null);

  const [boards, setBoards] = useState<Record<string, boolean>>(
    () => Object.fromEntries(initial.nav.map((n) => [n.id, true])),
  );

  const [worshipServices, setWorshipServices] = useState<WorshipService[]>(initial.worshipServices);
  const [worshipOrder, setWorshipOrder] = useState<[string, string, string][]>(initial.worshipOrder);

  const [notices, setNotices] = useState<Notice[]>(initial.notices);
  const [noticeCategories, setNoticeCategories] = useState<string[]>(initial.noticeCategories);
  const [events, setEvents] = useState<EventItem[]>(initial.events);

  const [pastor, setPastor] = useState<Pastor>(initial.pastor);
  const [vision, setVision] = useState<VisionItem[]>(initial.vision);
  const [history, setHistory] = useState<HistoryItem[]>(initial.history);
  const [staff, setStaff] = useState<StaffMember[]>(initial.staff);

  const [transportation, setTransportation] = useState<Transportation[]>(initial.transportation);
  const [galleries, setGalleries] = useState<GalleryItem[]>(initial.galleries);
  const [galleryCategories, setGalleryCategories] = useState<string[]>(initial.galleryCategories);

  const [save, setSave] = useState<SaveState>("idle");
  const [saveMsg, setSaveMsg] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  const [isPublished, setIsPublished] = useState(false);
  const [churchExistsOnServer, setChurchExistsOnServer] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [modal, setModal] = useState<null | "required" | "payment">(null);

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
            setBoards(Object.fromEntries(initial.nav.map((n) => [n.id, c.enabledPages.includes(n.id)])));
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

  const previewHref = useMemo(() => `/${slug || initial.slug}`, [slug, initial.slug]);

  const [slugCheck, setSlugCheck] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const trimmedSlug = slug.trim();
  const siteRequiredFilled = !!trimmedSlug && !!name.trim() && slugCheck !== "taken";
  const contactRequiredFilled = !!phone.trim() && !!email.trim() && !!address.trim();
  const allRequiredFilled = siteRequiredFilled && contactRequiredFilled;

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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  function clearLogo() {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function toggleBoard(id: string) {
    setBoards((prev) => ({ ...prev, [id]: !prev[id] }));
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
        logoUrl: logoPreview && !logoPreview.startsWith("blob:") ? logoPreview : null,
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
      if (!subscription?.isActive) {
        setModal("payment");
        return;
      }
    }

    setPublishLoading(true);
    try {
      const updated = await onchurchChurch.publish(target);
      setIsPublished(updated.isPublished);
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
            <div className="brand-mark" />
            <div className="brand-text">
              <div className="brand-name">관리자 콘솔</div>
              <div className="brand-eng">ONCHURCH ADMIN</div>
            </div>
          </Link>
          <div className="admin-topbar-actions">
            <div className="admin-publish-toggle" aria-live="polite">
              <span className="admin-publish-toggle-label">
                사이트 운영
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
              <Icon.video style={{ width: 14, height: 14 }} />
              사이트 미리보기
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
              <div className="admin-sidebar-eyebrow">페이지</div>
              {initial.nav.map((n) => {
                const on = boards[n.id] ?? true;
                const isActive = activeSection === `page:${n.id}`;
                return (
                  <div key={n.id} className={`admin-sidebar-page ${isActive ? "active" : ""}`}>
                    <button
                      type="button"
                      className="admin-sidebar-page-label"
                      onClick={() => setActiveSection(`page:${n.id}` as SectionKey)}
                    >
                      <span>{n.label}</span>
                    </button>
                    <button
                      type="button"
                      className={`toggle ${on ? "on" : ""}`}
                      onClick={() => toggleBoard(n.id)}
                      aria-label={`${n.label} 활성화`}
                      aria-pressed={on}
                    />
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
                        <button type="button" className="btn btn-primary" onClick={onPickFile}>
                          <Icon.image style={{ width: 14, height: 14 }} />
                          이미지 업로드
                        </button>
                        {logoPreview && (
                          <button type="button" className="btn btn-ghost" onClick={clearLogo}>
                            제거
                          </button>
                        )}
                        <p className="form-hint" style={{ marginTop: 4 }}>최대 2MB. PNG/SVG 권장.</p>
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
                        <input id="ad-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="서울특별시 강남구 테헤란로 ..." required />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "banners" && <BannersEditor />}

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
                      services={worshipServices}
                      setServices={setWorshipServices}
                      order={worshipOrder}
                      setOrder={setWorshipOrder}
                    />
                  )}

                  {activePage === "notices" && <NoticesEditor />}

                  {activePage === "schedule" && (
                    <ScheduleEditor events={events} setEvents={setEvents} />
                  )}

                  {activePage === "about" && (
                    <AboutEditor
                      pastor={pastor}
                      setPastor={setPastor}
                      vision={vision}
                      setVision={setVision}
                      history={history}
                      setHistory={setHistory}
                      staff={staff}
                      setStaff={setStaff}
                    />
                  )}

                  {activePage === "directions" && (
                    <DirectionsEditor transportation={transportation} setTransportation={setTransportation} />
                  )}

                  {activePage === "gallery" && (
                    <GalleryEditor
                      galleries={galleries}
                      setGalleries={setGalleries}
                      categories={galleryCategories}
                      setCategories={setGalleryCategories}
                    />
                  )}

                  {activePage !== "worship" &&
                    activePage !== "notices" &&
                    activePage !== "schedule" &&
                    activePage !== "about" &&
                    activePage !== "directions" &&
                    activePage !== "gallery" && (
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
                  사이트를 운영하려면 <strong>기본 정보</strong>와 <strong>연락처</strong>의 필수 항목을 모두 입력하고 저장해야 합니다.
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
                      setActiveSection(siteRequiredFilled ? "contact" : "site");
                    }}
                  >
                    필수 정보 입력하기
                  </button>
                </div>
              </>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
