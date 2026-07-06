"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { ApiError, clearTokens, onchurchUser } from "@/lib/api-client";
import { BulkEmailFeature } from "./features/bulk-email";
import { BulkSmsFeature } from "./features/bulk-sms";
import { ChurchesFeature } from "./features/churches";
import { DashboardFeature } from "./features/dashboard";
import { LedgerFeature } from "./features/ledger";
import { CalendarFeature } from "./features/calendar";

// 사이드바 메뉴 + 렌더링할 화면. 새 기능은 여기 한 줄과 render()의 case만 추가하면 된다.
type SectionKey = "dashboard" | "churches" | "calendar" | "ledger" | "bulk-email" | "bulk-sms";

const SECTIONS: { key: SectionKey; label: string; icon: (typeof Icon)[keyof typeof Icon] }[] = [
  { key: "dashboard", label: "대시보드", icon: Icon.building },
  { key: "churches", label: "교회 확인", icon: Icon.users },
  { key: "calendar", label: "결제 달력", icon: Icon.calendar },
  { key: "ledger", label: "재무 관리", icon: Icon.wallet },
  { key: "bulk-email", label: "대량 메일 발송", icon: Icon.mail },
  { key: "bulk-sms", label: "대량 문자 발송", icon: Icon.phone },
];

// 모바일 하단 바텀 네비에 노출할 섹션(대시보드는 상단 '온교회' 브랜드로 이동).
const BOTTOM_NAV: { key: SectionKey; label: string; icon: (typeof Icon)[keyof typeof Icon] }[] = [
  { key: "churches", label: "교회확인", icon: Icon.users },
  { key: "calendar", label: "결제달력", icon: Icon.calendar },
  { key: "ledger", label: "재무관리", icon: Icon.wallet },
  { key: "bulk-email", label: "메일 발송", icon: Icon.mail },
  { key: "bulk-sms", label: "문자 발송", icon: Icon.phone },
];

export function MasterApp() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);
  const [section, setSection] = useState<SectionKey>("dashboard");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await onchurchUser.getMe();
        if (cancelled) return;
        if (profile.role !== "master") {
          alert("마스터 계정만 접근할 수 있습니다.");
          router.push("/");
          return;
        }
        setAuthorized(true);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          router.push("/login");
          return;
        }
        alert("접근 권한을 확인할 수 없습니다.");
        router.push("/");
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">불러오는 중…</div>;
  }
  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 사이드바 (모바일에서는 숨기고 하단 바텀 네비로 대체) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5">
          <span className="text-lg font-bold text-gray-900">온교회</span>
          <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white">MASTER</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {SECTIONS.map((s) => {
            const active = s.key === section;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="shrink-0">{s.icon({ width: 18, height: 18 })}</span>
                {s.label}
              </button>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-gray-200 p-3">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <span className="shrink-0">{Icon.building({ width: 18, height: 18 })}</span>
            관리자 페이지
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8">
          {/* 모바일: '온교회' 브랜드 → 대시보드 */}
          <button
            type="button"
            onClick={() => setSection("dashboard")}
            className="flex items-center gap-2 md:hidden"
            aria-label="대시보드로 이동"
          >
            <span className="text-lg font-bold text-gray-900">온교회</span>
            <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white">MASTER</span>
          </button>
          {/* 데스크톱: 현재 섹션 라벨 */}
          <h1 className="hidden text-base font-bold text-gray-900 md:block">
            {SECTIONS.find((s) => s.key === section)?.label}
          </h1>
          {/* 모바일: 관리자 페이지 · 로그아웃 (데스크톱은 사이드바에 있음) */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="관리자 페이지"
            >
              {Icon.building({ width: 18, height: 18 })}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
            >
              로그아웃
            </button>
          </div>
        </header>
        <div className="p-4 pb-24 md:p-8">
          {section === "dashboard" && <DashboardFeature />}
          {section === "churches" && <ChurchesFeature />}
          {section === "calendar" && <CalendarFeature />}
          {section === "ledger" && <LedgerFeature />}
          {section === "bulk-email" && <BulkEmailFeature />}
          {section === "bulk-sms" && <BulkSmsFeature />}
        </div>
      </main>

      {/* 모바일 하단 바텀 네비 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-gray-200 bg-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="모바일 메뉴"
      >
        {BOTTOM_NAV.map((item) => {
          const active = item.key === section;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setSection(item.key);
                if (typeof window !== "undefined") window.scrollTo({ top: 0 });
              }}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition ${
                active ? "text-gray-900" : "text-gray-400"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="shrink-0">{item.icon({ width: 22, height: 22 })}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
