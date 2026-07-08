"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, onchurchMaster, type ChurchOverview } from "@/lib/api-client";
import { Icon } from "@/components/icons";

type LoadStatus = "loading" | "done" | "error";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 결제 종료일 마커: 무료체험 종료(trial) / 결제 종료(paid).
type Marker = { church: ChurchOverview; kind: "trial" | "paid" };

function ymd(iso: string): string {
  // 로컬 날짜 기준 "YYYY-MM-DD" (마스터 목록의 다른 날짜 표기와 동일한 기준).
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CalendarFeature() {
  const [churches, setChurches] = useState<ChurchOverview[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });

  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("loading");
      setError("");
      try {
        const size = 100;
        const first = await onchurchMaster.listChurches({ keyword: "", publishedOnly: false, page: 1, size });
        let all = first.items;
        let page = 1;
        while (all.length < first.totalCount) {
          page += 1;
          const res = await onchurchMaster.listChurches({ keyword: "", publishedOnly: false, page, size });
          if (res.items.length === 0) break;
          all = [...all, ...res.items];
        }
        if (alive) {
          setChurches(all);
          setStatus("done");
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof ApiError ? err.message : "교회 목록을 불러오지 못했습니다.");
          setStatus("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // "YYYY-MM-DD" -> 그 날 만료되는 마커 목록. 테스트 계정(owner.isTest)은 달력에서 제외.
  const markersByDay = useMemo(() => {
    const map = new Map<string, Marker[]>();
    for (const c of churches) {
      if (c.isTest) continue;
      // 교회당 하나만 표시: 결제 종료일이 있으면 그것, 없으면 무료체험 종료일.
      if (c.paidUntil) {
        const key = ymd(c.paidUntil);
        map.set(key, [...(map.get(key) ?? []), { church: c, kind: "paid" }]);
      } else if (c.freeTrialUntil) {
        const key = ymd(c.freeTrialUntil);
        map.set(key, [...(map.get(key) ?? []), { church: c, kind: "trial" }]);
      }
    }
    return map;
  }, [churches]);

  const firstDay = new Date(view.year, view.month - 1, 1).getDay();
  const daysInMonth = new Date(view.year, view.month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");

  // 이번 달 만료 건수 요약
  const monthSummary = useMemo(() => {
    let trial = 0;
    let paid = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${view.year}-${pad(view.month)}-${pad(d)}`;
      for (const m of markersByDay.get(key) ?? []) {
        if (m.kind === "trial") trial += 1;
        else paid += 1;
      }
    }
    return { trial, paid };
  }, [markersByDay, view, daysInMonth]);

  function shiftMonth(delta: number) {
    setView((v) => {
      const next = new Date(v.year, v.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  }

  const isToday = (day: number) =>
    view.year === today.getFullYear() && view.month === today.getMonth() + 1 && day === today.getDate();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">결제 달력</h2>
          <p className="text-sm text-gray-500">교회별 무료체험·결제 종료일을 한눈에 확인하세요.</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> 무료체험 종료 {monthSummary.trial}건
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" /> 결제 종료 {monthSummary.paid}건
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-bold text-gray-900">
            {view.year}년 {view.month}월
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <Icon.chevL />
            </button>
            <button
              type="button"
              onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() + 1 })}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              오늘
            </button>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <Icon.chevR />
            </button>
          </div>
        </div>

        {status === "loading" && <p className="py-10 text-center text-sm text-gray-500">불러오는 중...</p>}
        {status === "error" && <p className="py-10 text-center text-sm text-red-500">{error}</p>}

        {status === "done" && (
          <>
            <div className="grid grid-cols-7 border-b border-gray-100">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className={`pb-2 text-center text-xs font-semibold ${i === 0 ? "text-red-400" : "text-gray-400"}`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`lead-${i}`} className="min-h-[96px] border-b border-r border-gray-100 first:border-l" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dow = (firstDay + i) % 7;
                const key = `${view.year}-${pad(view.month)}-${pad(day)}`;
                const markers = markersByDay.get(key) ?? [];
                return (
                  <div
                    key={day}
                    className={`min-h-[96px] border-b border-r border-gray-100 p-1.5 ${dow === 0 ? "border-l" : ""}`}
                  >
                    <div
                      className={`mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                        isToday(day)
                          ? "bg-gray-900 text-white"
                          : dow === 0
                            ? "text-red-400"
                            : "text-gray-500"
                      }`}
                    >
                      {day}
                    </div>
                    <div className="flex flex-col gap-1">
                      {markers.map((m, idx) => (
                        <div
                          key={`${m.church.id}-${m.kind}-${idx}`}
                          title={`${m.church.name} · ${m.kind === "trial" ? "무료체험 종료" : "결제 종료"}`}
                          className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            m.kind === "trial" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {m.kind === "trial" ? "🔔" : "💳"} {m.church.name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
