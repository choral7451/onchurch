"use client";

import { useEffect, useRef, useState } from "react";
import { onchurchChurch } from "@/lib/api-client";
import { buildAdminUrl } from "@/lib/site-host";

// 랜딩에서 가입을 마치면 방금 만든 교회 홈페이지로 ?welcome=1 을 붙여 보낸다(app/signup/form.tsx).
// 그 첫 방문에서만 "7일 무료 체험이 시작됐어요" 안내를 한 번 띄우고, 주소에서 표시를 지운다(새로고침해도 다시 안 뜬다).
const WELCOME_PARAM = "welcome";
const TRIAL_DAYS = 7;

function formatUntil(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function TrialWelcomeModal({ churchName }: { churchName: string }) {
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState("");
  const primaryRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(WELCOME_PARAM) !== "1") return;
    url.searchParams.delete(WELCOME_PARAM);
    window.history.replaceState(window.history.state, "", url.toString());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소의 일회성 표시를 읽어 여는 것이라 첫 렌더 뒤에만 알 수 있다
    setOpen(true);
    setUntil(formatUntil(null));
    // 서버의 실제 체험 종료일로 맞춘다. 실패하면 오늘부터 7일 기준 날짜를 그대로 둔다.
    onchurchChurch
      .getMine()
      .then((res) => {
        if (res.subscription?.freeTrialUntil) setUntil(formatUntil(res.subscription.freeTrialUntil));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="trial-welcome-backdrop" role="dialog" aria-modal="true" aria-labelledby="trial-welcome-title" onClick={() => setOpen(false)}>
      <div className="trial-welcome" onClick={(e) => e.stopPropagation()}>
        <div className="trial-welcome-badge" aria-hidden="true">7일 무료</div>
        <h2 className="trial-welcome-title" id="trial-welcome-title">무료 체험이 시작됐어요</h2>
        <p className="trial-welcome-desc">
          {churchName} 홈페이지가 공개됐어요.
          <br />
          {until ? <><strong>{until}까지</strong> 모든 기능을 무료로 써 보세요.</> : "7일 동안 모든 기능을 무료로 써 보세요."}
        </p>
        <ul className="trial-welcome-list">
          <li>관리자 페이지에서 디자인과 메뉴를 바꿀 수 있어요</li>
          <li>공지·설교·앨범을 올리면 성도 앱으로 알림이 가요</li>
          <li>체험이 끝나면 결제 메뉴에서 월 1만원으로 이어 쓸 수 있어요</li>
        </ul>
        <div className="trial-welcome-actions">
          <a ref={primaryRef} href={buildAdminUrl()} className="btn btn-primary">관리자 페이지로 가기</a>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>홈페이지 먼저 둘러보기</button>
        </div>
      </div>
    </div>
  );
}
