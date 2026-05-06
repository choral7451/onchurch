"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import type { Brand, EventItem, NavItem, Notice, WorshipService } from "@/lib/types";
import { WorshipEditor } from "./page-editors/worship";
import { NoticesEditor } from "./page-editors/notices";
import { ScheduleEditor } from "./page-editors/schedule";

type Initial = {
  slug: string;
  brand: Brand;
  nav: NavItem[];
  worshipServices: WorshipService[];
  worshipOrder: [string, string, string][];
  notices: Notice[];
  noticeCategories: string[];
  events: EventItem[];
};

type SaveState = "idle" | "saving" | "saved";

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

type SectionKey = "site" | "logo" | "contact" | `page:${string}`;

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

  const [save, setSave] = useState<SaveState>("idle");

  const previewHref = useMemo(() => `/${slug || initial.slug}`, [slug, initial.slug]);

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
    setSave("saving");
    await new Promise((r) => setTimeout(r, 700));
    setSave("saved");
    setTimeout(() => setSave("idle"), 2000);
  }

  function onLogout() {
    router.push("/login");
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
                className={`admin-sidebar-item ${activeSection === "site" ? "active" : ""}`}
                onClick={() => setActiveSection("site")}
              >
                기본 정보
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "logo" ? "active" : ""}`}
                onClick={() => setActiveSection("logo")}
              >
                로고
              </button>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === "contact" ? "active" : ""}`}
                onClick={() => setActiveSection("contact")}
              >
                연락처
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
                  <div className="admin-section-body">
                    <div className="form-row full">
                      <label htmlFor="ad-slug">서브도메인</label>
                      <div className="slug-input">
                        <span className="slug-prefix">https://</span>
                        <input
                          id="ad-slug"
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, "").slice(0, 30))}
                          placeholder="yourchurch"
                          required
                        />
                        <span className="slug-suffix">.onchurch.kr</span>
                      </div>
                      <span className="form-hint">영문 소문자, 숫자, 하이픈만 사용 가능 · 한 번 발급되면 변경에 제한이 있을 수 있습니다.</span>
                    </div>

                    <div className="form-grid">
                      <div className="form-row">
                        <label htmlFor="ad-name">교회 이름 (한글)</label>
                        <input id="ad-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="성동교회" required />
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
                  <div className="admin-section-body">
                    <div className="form-grid">
                      <div className="form-row">
                        <label htmlFor="ad-phone">전화번호</label>
                        <input id="ad-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-1234-5678" />
                      </div>
                      <div className="form-row">
                        <label htmlFor="ad-email">이메일</label>
                        <input id="ad-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@yourchurch.kr" />
                      </div>
                      <div className="form-row full">
                        <label htmlFor="ad-address">주소</label>
                        <input id="ad-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="서울특별시 ..." />
                      </div>
                    </div>
                  </div>
                </section>
              )}

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

                  {activePage === "notices" && (
                    <NoticesEditor
                      notices={notices}
                      setNotices={setNotices}
                      categories={noticeCategories}
                      setCategories={setNoticeCategories}
                    />
                  )}

                  {activePage === "schedule" && (
                    <ScheduleEditor events={events} setEvents={setEvents} />
                  )}

                  {activePage !== "worship" && activePage !== "notices" && activePage !== "schedule" && (
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
                  {save === "idle" && <span style={{ color: "var(--muted)", fontSize: 13 }}>변경사항은 저장 후 적용됩니다.</span>}
                </div>
                <div className="admin-savebar-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => router.refresh()}>
                    변경 취소
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={save === "saving"}>
                    {save === "saving" ? "저장 중..." : "변경사항 저장"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
