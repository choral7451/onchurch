"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { ApiError, clearTokens, onchurchUser } from "@/lib/api-client";
import { BulkEmailFeature } from "./features/bulk-email";

// 사이드바 메뉴 + 렌더링할 화면. 새 기능은 여기 한 줄과 render()의 case만 추가하면 된다.
type SectionKey = "dashboard" | "bulk-email";

const SECTIONS: { key: SectionKey; label: string; icon: (typeof Icon)[keyof typeof Icon] }[] = [
  { key: "dashboard", label: "대시보드", icon: Icon.building },
  { key: "bulk-email", label: "대량 메일 발송", icon: Icon.mail },
];

function Dashboard() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900">대시보드</h2>
      <p className="mt-1 text-sm text-gray-500">온교회 마스터 콘솔입니다. 왼쪽 메뉴에서 기능을 선택하세요.</p>
    </div>
  );
}

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
      {/* 사이드바 */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
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
        <header className="flex h-16 items-center border-b border-gray-200 bg-white px-8">
          <h1 className="text-base font-bold text-gray-900">{SECTIONS.find((s) => s.key === section)?.label}</h1>
        </header>
        <div className="p-8">
          {section === "dashboard" && <Dashboard />}
          {section === "bulk-email" && <BulkEmailFeature />}
        </div>
      </main>
    </div>
  );
}
