"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import {
  onchurchEvent,
  onchurchGallery,
  onchurchInquiry,
  onchurchNotice,
  onchurchSermon,
  type Subscription,
} from "@/lib/api-client";
import { SITE_TEMPLATE_META, resolveTemplateId } from "@/components/templates/meta";
import type { SiteDesign } from "@/lib/site-design";

// 관리자 '시작 화면'(테스트 교회 전용 5개 영역 개편의 첫 화면).
// 온보딩이 끝난 뒤에도 남아서 사이트·구독 상태, 콘텐츠 현황(공지·설교·일정·갤러리·문의), 필수 설정, 바로가기를 한 화면에 보여준다.

export type StartStep = { label: string; desc: string; done: boolean; target: string };

type Props = {
  churchName: string;
  slug: string;
  steps: StartStep[];
  subscription: Subscription | null;
  isPublished: boolean;
  previewHref: string;
  siteTemplate: string;
  siteDesign: SiteDesign | null;
  onOpen: (section: string) => void;
  onClickGoHome: (e: React.MouseEvent) => void;
};

type ContentRow = { key: string; label: string; count: number | null; countUnit: string; latest: string | null; sub: string | null; target: string; warn?: boolean };

function formatYMD(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatMD(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function StartHome({ churchName, slug, steps, subscription, isPublished, previewHref, siteTemplate, siteDesign, onOpen, onClickGoHome }: Props) {
  const done = steps.filter((s) => s.done).length;
  const allDone = done === steps.length;
  const until = subscription?.isFreeTrial ? subscription.freeTrialUntil : subscription?.paidUntil ?? null;
  const left = daysLeft(until);
  const templateMeta = SITE_TEMPLATE_META.find((t) => t.id === resolveTemplateId(siteTemplate)) ?? SITE_TEMPLATE_META[0];
  const colors = siteDesign?.colors ?? null;
  const customizedSections = Object.keys(siteDesign?.sections ?? {}).length;

  // 콘텐츠 현황: 각 목록을 한 번씩 불러 건수와 최신 항목만 뽑는다. 실패한 항목은 "—"로 둔다.
  const [rows, setRows] = useState<ContentRow[]>(() => [
    { key: "notices", label: "공지사항", count: null, countUnit: "건", latest: null, sub: null, target: "page:notices" },
    { key: "sermons", label: "설교", count: null, countUnit: "편", latest: null, sub: null, target: "page:sermons" },
    { key: "schedule", label: "다가오는 일정", count: null, countUnit: "건", latest: null, sub: null, target: "page:schedule" },
    { key: "gallery", label: "갤러리", count: null, countUnit: "장", latest: null, sub: null, target: "page:gallery" },
    { key: "inquiries", label: "미답변 문의", count: null, countUnit: "건", latest: null, sub: null, target: "page:community" },
  ]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [n, s, e, g, q] = await Promise.allSettled([
        onchurchNotice.listMine(),
        onchurchSermon.listMine(),
        onchurchEvent.listMine(),
        onchurchGallery.listMine(),
        onchurchInquiry.listMine(),
      ]);
      if (!alive) return;
      const now = Date.now();
      setRows((prev) =>
        prev.map((r) => {
          if (r.key === "notices" && n.status === "fulfilled") {
            const list = (n.value.notices ?? []).filter((x) => x.isActive);
            const latest = list.slice().sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))[0];
            return { ...r, count: list.length, latest: latest?.title ?? null, sub: latest ? formatYMD(latest.publishedAt ?? latest.createdAt) : null };
          }
          if (r.key === "sermons" && s.status === "fulfilled") {
            const list = s.value.filter((x) => x.isActive);
            const latest = list.slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
            return { ...r, count: list.length, latest: latest?.title ?? null, sub: latest?.date ? formatYMD(latest.date) : null };
          }
          if (r.key === "schedule" && e.status === "fulfilled") {
            const upcoming = (e.value.events ?? [])
              .filter((x) => new Date(x.endAt ?? x.startAt).getTime() >= now - 86400000)
              .sort((a, b) => a.startAt.localeCompare(b.startAt));
            const next = upcoming[0];
            return { ...r, count: upcoming.length, latest: next?.title ?? null, sub: next ? `${formatMD(next.startAt)}${next.location ? ` · ${next.location}` : ""}` : null };
          }
          if (r.key === "gallery" && g.status === "fulfilled") {
            const list = g.value.filter((x) => x.isActive);
            const latest = list.slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
            return { ...r, count: list.length, latest: latest?.title ?? null, sub: latest?.date ? formatYMD(latest.date) : null };
          }
          if (r.key === "inquiries" && q.status === "fulfilled") {
            const pending = q.value.filter((x) => x.status === "pending");
            const latest = pending.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            return { ...r, count: pending.length, latest: latest?.question ?? null, sub: latest ? formatYMD(latest.createdAt) : null, warn: pending.length > 0 };
          }
          return { ...r, count: r.count ?? 0 };
        }),
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  const shortcuts: { label: string; desc: string; target: string; icon: keyof typeof Icon }[] = [
    { label: "공지 올리기", desc: "교회 소식에 새 글", target: "page:notices", icon: "bell" },
    { label: "설교 등록", desc: "유튜브 링크로 추가", target: "page:sermons", icon: "play" },
    { label: "일정 추가", desc: "행사 캘린더", target: "page:schedule", icon: "calendar" },
    { label: "사진 올리기", desc: "갤러리 앨범", target: "page:gallery", icon: "image" },
    { label: "예배 시간 수정", desc: "예배 안내", target: "page:worship", icon: "clock" },
    { label: "홈 배너 교체", desc: "상단 배너 슬라이드", target: "banners", icon: "video" },
  ];

  return (
    <div className="admin-start">
      <div className="admin-section admin-start-strip">
        <div className="admin-start-cell">
          <span className="admin-start-k">홈페이지</span>
          <span className="admin-start-v">{isPublished ? "공개 중" : "비공개"}</span>
          <span className={`admin-sidebar-pill ${isPublished ? "complete" : "incomplete"}`}>{isPublished ? "운영 ON" : "운영 OFF"}</span>
        </div>
        <div className="admin-start-cell">
          <span className="admin-start-k">필수 설정</span>
          <span className="admin-start-v">{done}<small>/ {steps.length}</small></span>
          <span className={`admin-sidebar-pill ${allDone ? "complete" : "incomplete"}`}>{allDone ? "완료" : `${steps.length - done}개 남음`}</span>
        </div>
        <div className="admin-start-cell">
          <span className="admin-start-k">구독</span>
          <span className="admin-start-v">{subscription?.isActive ? (subscription.isFreeTrial ? "무료 체험" : "이용 중") : "만료"}</span>
          <span className="admin-sidebar-pill optional">{left === null ? "—" : left >= 0 ? `D-${left} · ${formatYMD(until)}` : `${formatYMD(until)} 만료`}</span>
        </div>
        <div className="admin-start-cell admin-start-cell-url">
          <span className="admin-start-k">홈페이지 주소</span>
          <span className="admin-start-url">{slug ? `${slug}.onchurch.kr` : "—"}</span>
          <Link href={previewHref} target="_blank" className="btn btn-secondary" onClick={onClickGoHome}>
            <Icon.arrow style={{ width: 13, height: 13 }} /> 열기
          </Link>
        </div>
      </div>

      <div className="admin-start-grid">
        <section className="admin-section">
          <div className="admin-section-head admin-start-head">
            <div>
              <div className="admin-section-eyebrow">CONTENT</div>
              <h2>콘텐츠 현황</h2>
            </div>
            <span className="admin-start-head-note">{churchName || "교회"} 홈페이지에 올라간 내용</span>
          </div>
          <div className="admin-section-body admin-start-list">
            {rows.map((r) => (
              <button key={r.key} type="button" className={`admin-start-row ${r.warn ? "warn" : ""}`} onClick={() => onOpen(r.target)}>
                <span className="admin-start-row-count">
                  {r.count === null ? <span className="skel" style={{ width: 28, height: 18, display: "inline-block" }} /> : r.count}
                  <small>{r.countUnit}</small>
                </span>
                <span className="admin-start-row-body">
                  <strong>{r.label}</strong>
                  <span>{r.latest ? `${r.latest}${r.sub ? ` · ${r.sub}` : ""}` : r.count === 0 ? "아직 없습니다" : r.count === null ? "불러오는 중" : ""}</span>
                </span>
                <Icon.chevR style={{ width: 16, height: 16, color: "var(--muted)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <section className="admin-section">
            <div className="admin-section-head admin-start-head">
              <div>
                <div className="admin-section-eyebrow">CHECKLIST</div>
                <h2>필수 설정</h2>
              </div>
              <span className={`admin-sidebar-pill ${allDone ? "complete" : "incomplete"}`}>{done}/{steps.length}</span>
            </div>
            <div className="admin-section-body admin-start-list">
              {steps.map((s) => (
                <button key={s.target} type="button" className={`admin-start-row ${s.done ? "done" : ""}`} onClick={() => onOpen(s.target)}>
                  <span className="admin-start-check-mark" aria-hidden="true">{s.done ? "✓" : ""}</span>
                  <span className="admin-start-row-body">
                    <strong>{s.label}</strong>
                    <span>{s.done ? "입력 완료" : s.desc}</span>
                  </span>
                  <span className="admin-start-row-action">{s.done ? "수정" : "입력하기"}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-head admin-start-head">
              <div>
                <div className="admin-section-eyebrow">DESIGN</div>
                <h2>홈 디자인</h2>
              </div>
            </div>
            <div className="admin-section-body admin-start-design">
              <div className="admin-start-design-swatches" aria-hidden="true">
                <i style={{ background: colors?.main ?? templateMeta.colors.main }} />
                <i style={{ background: colors?.point ?? templateMeta.colors.point }} />
              </div>
              <div className="admin-start-row-body">
                <strong>{templateMeta.label} 템플릿{colors ? " · 색상 지정" : ""}</strong>
                <span>{customizedSections > 0 ? `섹션 ${customizedSections}개 디자인 변경됨` : "모든 섹션이 템플릿 기본 디자인"}</span>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => onOpen("home-order")}>바꾸기</button>
            </div>
          </section>
        </div>

        <section className="admin-section">
          <div className="admin-section-head admin-start-head">
            <div>
              <div className="admin-section-eyebrow">SHORTCUTS</div>
              <h2>자주 하는 일</h2>
            </div>
          </div>
          <div className="admin-section-body admin-start-list">
            {shortcuts.map((s) => {
              const I = Icon[s.icon];
              return (
                <button key={s.target + s.label} type="button" className="admin-start-row" onClick={() => onOpen(s.target)}>
                  <span className="admin-start-shortcut-icon"><I style={{ width: 16, height: 16 }} /></span>
                  <span className="admin-start-row-body">
                    <strong>{s.label}</strong>
                    <span>{s.desc}</span>
                  </span>
                  <Icon.chevR style={{ width: 16, height: 16, color: "var(--muted)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
