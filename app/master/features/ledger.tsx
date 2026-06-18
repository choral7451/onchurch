"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, onchurchMaster, type LedgerEntry, type LedgerType } from "@/lib/api-client";

const PAGE_SIZE = 50;

type LoadStatus = "loading" | "done" | "error";

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function currentMonthStr(): string {
  return todayStr().slice(0, 7);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateHeader(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${iso} (${WEEKDAYS[d.getDay()]})`;
}

function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function LedgerFeature() {
  const [month, setMonth] = useState(currentMonthStr());
  const [showAll, setShowAll] = useState(false);
  const monthParam = showAll ? "" : month;

  // 입력 폼
  const [entryDate, setEntryDate] = useState(todayStr());
  const [type, setType] = useState<LedgerType>("income");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // 목록 + 합계
  const [items, setItems] = useState<LedgerEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const seqRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = items.length < totalCount;
  const amount = useMemo(() => Number(amountStr.replace(/[^0-9]/g, "")) || 0, [amountStr]);

  // 월 필터 또는 등록/삭제(reloadKey) 변경 → 1페이지부터 다시 로드
  useEffect(() => {
    const seq = ++seqRef.current;
    setStatus("loading");
    setListError("");
    setLoadingMore(false);
    (async () => {
      try {
        const res = await onchurchMaster.listLedger({ month: monthParam, page: 1, size: PAGE_SIZE });
        if (seq !== seqRef.current) return;
        setItems(res.items);
        setTotalCount(res.totalCount);
        setIncome(res.totalIncome);
        setExpense(res.totalExpense);
        setBalance(res.balance);
        setStatus("done");
      } catch (err) {
        if (seq !== seqRef.current) return;
        setStatus("error");
        setListError(err instanceof ApiError ? err.message : "재무 내역을 불러오지 못했습니다.");
      }
    })();
  }, [monthParam, reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || status !== "done" || !hasMore) return;
    const seq = seqRef.current;
    const next = Math.floor(items.length / PAGE_SIZE) + 1;
    setLoadingMore(true);
    try {
      const res = await onchurchMaster.listLedger({ month: monthParam, page: next, size: PAGE_SIZE });
      if (seq !== seqRef.current) return;
      setItems((prev) => [...prev, ...res.items]);
      setTotalCount(res.totalCount);
    } catch {
      // 추가 로드 실패는 조용히 무시
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, status, hasMore, items.length, monthParam]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  async function handleSubmit() {
    setFormError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      setFormError("거래 일자를 선택해주세요.");
      return;
    }
    if (amount <= 0) {
      setFormError("금액을 입력해주세요.");
      return;
    }
    if (!category.trim()) {
      setFormError("항목(어떻게)을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await onchurchMaster.createLedgerEntry({
        entryDate,
        type,
        amount,
        category: category.trim(),
        memo: memo.trim() || undefined,
      });
      // 입력 일부 초기화 (일자·구분은 연속 입력 편의를 위해 유지)
      setAmountStr("");
      setCategory("");
      setMemo("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("이 항목을 삭제할까요?")) return;
    try {
      await onchurchMaster.deleteLedgerEntry(id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[360px_1fr]">
      {/* 왼쪽: 입력 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">재무 기록</h2>
        <p className="mt-1 text-sm text-gray-500">서비스 운영 수입·지출을 일자별로 기록합니다.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">거래 일자</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">구분</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  type === "income"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-300 text-gray-500 hover:bg-gray-50"
                }`}
              >
                수입
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  type === "expense"
                    ? "border-red-500 bg-red-50 text-red-600"
                    : "border-gray-300 text-gray-500 hover:bg-gray-50"
                }`}
              >
                지출
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">금액</label>
            <div className="relative mt-2">
              <input
                type="text"
                inputMode="numeric"
                value={amount ? amount.toLocaleString("ko-KR") : ""}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-right text-sm focus:border-gray-900 focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">항목 <span className="text-gray-400">(어떻게)</span></label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={type === "income" ? "예: 구독료, 광고 수익" : "예: AWS 서버비, 환불"}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">메모 <span className="text-gray-400">(선택)</span></label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="상세 내용"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>

          {formError && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "등록 중…" : "기록 추가"}
          </button>
        </div>
      </div>

      {/* 오른쪽: 합계 + 목록 */}
      <div className="border-t border-gray-200 pt-8 xl:border-l xl:border-t-0 xl:pl-10 xl:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">내역</h2>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              disabled={showAll}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none disabled:opacity-40"
            />
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-gray-900"
              />
              전체
            </label>
          </div>
        </div>

        {/* 합계 카드 */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs text-gray-500">수입</div>
            <div className="mt-1 text-base font-bold text-green-700">{won(income)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs text-gray-500">지출</div>
            <div className="mt-1 text-base font-bold text-red-600">{won(expense)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs text-gray-500">잔액</div>
            <div className={`mt-1 text-base font-bold ${balance < 0 ? "text-red-600" : "text-gray-900"}`}>{won(balance)}</div>
          </div>
        </div>

        <div className="mt-5">
          {status === "loading" && <p className="text-sm text-gray-500">불러오는 중…</p>}
          {status === "error" && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</div>}
          {status === "done" && items.length === 0 && (
            <p className="text-sm text-gray-500">{showAll ? "기록이 없습니다." : "이 달의 기록이 없습니다."}</p>
          )}

          <div className="space-y-1">
            {items.map((entry, i) => {
              const showHeader = i === 0 || items[i - 1].entryDate !== entry.entryDate;
              const isIncome = entry.type === "income";
              return (
                <div key={entry.id}>
                  {showHeader && (
                    <div className="mt-4 mb-1 border-b border-gray-100 pb-1 text-xs font-semibold text-gray-500 first:mt-0">
                      {formatDateHeader(entry.entryDate)}
                    </div>
                  )}
                  <div className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                            isIncome ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}
                        >
                          {isIncome ? "수입" : "지출"}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-900">{entry.category}</span>
                      </div>
                      {entry.memo && <div className="mt-0.5 truncate text-xs text-gray-400">{entry.memo}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`text-sm font-bold ${isIncome ? "text-green-700" : "text-red-600"}`}>
                        {isIncome ? "+" : "-"}
                        {won(entry.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="text-gray-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                        aria-label="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && <div ref={sentinelRef} className="h-1" />}
          {loadingMore && <p className="py-2 text-center text-xs text-gray-400">더 불러오는 중…</p>}
        </div>
      </div>
    </div>
  );
}
