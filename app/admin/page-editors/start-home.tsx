"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import type { Subscription } from "@/lib/api-client";

// 관리자 '시작 화면'(테스트 교회 전용 5개 영역 개편의 첫 화면).
// 온보딩이 끝난 뒤에도 남아서 필수 설정 진행 상황, 자주 하는 일 바로가기, 사이트·구독 상태를 한눈에 보여준다.

export type StartStep = { label: string; desc: string; done: boolean; target: string };

type Props = {
  churchName: string;
  steps: StartStep[];
  subscription: Subscription | null;
  isPublished: boolean;
  previewHref: string;
  onOpen: (section: string) => void;
  onClickGoHome: (e: React.MouseEvent) => void;
};

function formatYMD(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
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

export function StartHome({ churchName, steps, subscription, isPublished, previewHref, onOpen, onClickGoHome }: Props) {
  const done = steps.filter((s) => s.done).length;
  const allDone = done === steps.length;
  const until = subscription?.isFreeTrial ? subscription.freeTrialUntil : subscription?.paidUntil ?? null;
  const left = daysLeft(until);

  const shortcuts: { label: string; desc: string; target: string; icon: keyof typeof Icon }[] = [
    { label: "공지 올리기", desc: "교회 소식에 새 글", target: "page:notices", icon: "bell" },
    { label: "설교 등록", desc: "유튜브 링크로 추가", target: "page:sermons", icon: "play" },
    { label: "일정 추가", desc: "행사 캘린더", target: "page:schedule", icon: "calendar" },
    { label: "홈 디자인", desc: "색상 · 섹션 바꾸기", target: "home-order", icon: "image" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="admin-start-stats">
        <div className="admin-section admin-start-stat">
          <span className="admin-start-stat-k">홈페이지</span>
          <span className="admin-start-stat-v">{isPublished ? "공개 중" : "비공개"}</span>
          <span className={`admin-sidebar-pill ${isPublished ? "complete" : "incomplete"}`}>{isPublished ? "운영 ON" : "운영 OFF"}</span>
        </div>
        <div className="admin-section admin-start-stat">
          <span className="admin-start-stat-k">필수 설정</span>
          <span className="admin-start-stat-v">
            {done}<small>/ {steps.length}</small>
          </span>
          <span className={`admin-sidebar-pill ${allDone ? "complete" : "incomplete"}`}>{allDone ? "완료" : `${steps.length - done}개 남음`}</span>
        </div>
        <div className="admin-section admin-start-stat">
          <span className="admin-start-stat-k">구독</span>
          <span className="admin-start-stat-v">
            {subscription?.isActive ? (subscription.isFreeTrial ? "무료 체험" : "이용 중") : "만료"}
          </span>
          <span className="admin-sidebar-pill optional">
            {left === null ? "—" : left >= 0 ? `${left}일 남음 · ${formatYMD(until)}` : `${formatYMD(until)} 만료`}
          </span>
        </div>
      </div>

      <div className="admin-start-grid">
        <section className="admin-section">
          <div className="admin-section-head">
            <div className="admin-section-eyebrow">CHECKLIST</div>
            <h2>필수 설정</h2>
            <p>{allDone ? "모두 완료했습니다. 아래 바로가기로 콘텐츠를 채워 보세요." : "사이트 공개에 꼭 필요한 항목입니다. 남은 항목을 눌러 바로 입력할 수 있어요."}</p>
          </div>
          <div className="admin-section-body" style={{ display: "flex", flexDirection: "column" }}>
            {steps.map((s) => (
              <div key={s.target} className={`admin-start-check ${s.done ? "done" : ""}`}>
                <span className="admin-start-check-mark" aria-hidden="true">{s.done ? "✓" : ""}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{s.label}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12.5 }}>{s.desc}</div>
                </div>
                <button type="button" className={`btn ${s.done ? "btn-ghost" : "btn-secondary"}`} onClick={() => onOpen(s.target)}>
                  {s.done ? "수정" : "입력하기"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-head">
            <div className="admin-section-eyebrow">SHORTCUTS</div>
            <h2>자주 하는 일</h2>
            <p>{churchName || "교회"} 홈페이지에 자주 올리는 것들입니다.</p>
          </div>
          <div className="admin-section-body admin-start-shortcuts">
            {shortcuts.map((s) => {
              const I = Icon[s.icon];
              return (
                <button key={s.target} type="button" className="admin-start-shortcut" onClick={() => onOpen(s.target)}>
                  <span className="admin-start-shortcut-icon"><I style={{ width: 18, height: 18 }} /></span>
                  <strong>{s.label}</strong>
                  <span>{s.desc}</span>
                </button>
              );
            })}
            <Link href={previewHref} target="_blank" className="admin-start-shortcut" onClick={onClickGoHome}>
              <span className="admin-start-shortcut-icon"><Icon.arrow style={{ width: 18, height: 18 }} /></span>
              <strong>홈페이지 보기</strong>
              <span>새 창에서 열기</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
