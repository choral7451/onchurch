"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, onchurchMaster, type MasterDashboard } from "@/lib/api-client";

type LoadStatus = "loading" | "done" | "error";

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = iso.slice(8, 10);
  return `${Number(day)}일 (${WEEKDAYS[d.getDay()]})`;
}

export function DashboardFeature() {
  const [month, setMonth] = useState(currentMonthStr());
  const [data, setData] = useState<MasterDashboard | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const seqRef = useRef(0);

  useEffect(() => {
    const seq = ++seqRef.current;
    setStatus("loading");
    setError("");
    (async () => {
      try {
        const res = await onchurchMaster.getDashboard(month);
        if (seq !== seqRef.current) return;
        setData(res);
        setStatus("done");
      } catch (err) {
        if (seq !== seqRef.current) return;
        setStatus("error");
        setError(err instanceof ApiError ? err.message : "통계를 불러오지 못했습니다.");
      }
    })();
  }, [month]);

  const ledger = data?.ledger;
  const funnel = data?.funnel;
  const balance = ledger ? ledger.totalIncome - ledger.totalExpense : 0;
  const inflow = data?.paidChurchInflow ?? [];
  const inflowTotal = inflow.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">대시보드</h2>
          <p className="mt-1 text-sm text-gray-500">테스트 계정과 해당 교회는 통계에서 제외됩니다.</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>

      {status === "loading" && <p className="mt-8 text-sm text-gray-500">불러오는 중…</p>}
      {status === "error" && <div className="mt-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {status === "done" && ledger && funnel && data && (
        <div className="mt-6 space-y-8">
          {/* 전체 누적(월 무관) */}
          <section>
            <h3 className="text-sm font-bold text-gray-700">전체 누적</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="text-xs text-gray-500">결제한 교회 총수</div>
                <div className="mt-1 text-lg font-bold text-gray-900">
                  {data.overall.paidChurchTotal.toLocaleString("ko-KR")}개
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="text-xs text-gray-500">전체 수입</div>
                <div className="mt-1 text-lg font-bold text-green-700">{won(data.overall.totalIncome)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="text-xs text-gray-500">전체 지출</div>
                <div className="mt-1 text-lg font-bold text-red-600">{won(data.overall.totalExpense)}</div>
              </div>
            </div>
          </section>

          {/* 재무 */}
          <section>
            <h3 className="text-sm font-bold text-gray-700">이 달의 재무</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="text-xs text-gray-500">총 수입</div>
                <div className="mt-1 text-lg font-bold text-green-700">{won(ledger.totalIncome)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="text-xs text-gray-500">총 지출</div>
                <div className="mt-1 text-lg font-bold text-red-600">{won(ledger.totalExpense)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="text-xs text-gray-500">잔액</div>
                <div className={`mt-1 text-lg font-bold ${balance < 0 ? "text-red-600" : "text-gray-900"}`}>{won(balance)}</div>
              </div>
            </div>
          </section>

          {/* 랜딩 가입 퍼널 */}
          <section>
            <h3 className="text-sm font-bold text-gray-700">이 달의 랜딩 가입 퍼널</h3>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <FunnelCard label="가입" value={funnel.signups} tone="gray" />
              <FunnelCard label="교회 생성" value={funnel.createdChurch} base={funnel.signups} tone="blue" />
              <FunnelCard label="결제" value={funnel.paid} base={funnel.signups} tone="green" />
            </div>
          </section>

          {/* 결제 교회 유입(일별) */}
          <section>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-gray-700">결제 교회 유입 (일별)</h3>
              <span className="text-sm text-gray-500">
                총 <span className="font-bold text-gray-900">{inflowTotal}</span>개
              </span>
            </div>
            <div className="mt-3 rounded-xl border border-gray-200 bg-white">
              {inflow.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-500">이 달에 유입된 결제 교회가 없습니다.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {inflow.map((d) => (
                    <li key={d.date} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-gray-700">{formatDay(d.date)}</span>
                      <span className="text-sm font-bold text-gray-900">{d.count}개</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function FunnelCard({
  label,
  value,
  base,
  tone,
}: {
  label: string;
  value: number;
  base?: number;
  tone: "gray" | "blue" | "green";
}) {
  const toneClass = tone === "green" ? "text-green-700" : tone === "blue" ? "text-blue-600" : "text-gray-900";
  const rate = base && base > 0 ? Math.round((value / base) * 100) : null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value.toLocaleString("ko-KR")}</div>
      {rate !== null && <div className="mt-0.5 text-xs text-gray-400">가입 대비 {rate}%</div>}
    </div>
  );
}
