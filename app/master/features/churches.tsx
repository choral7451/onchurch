"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, onchurchMaster, type ChurchOverview } from "@/lib/api-client";

const PAGE_SIZE = 30;

type LoadStatus = "loading" | "done" | "error";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 구독 칸 표시: 기간 문자열 + 활성/만료 배지.
function PeriodCell({ text, active, hasValue }: { text: string; active: boolean; hasValue: boolean }) {
  if (!hasValue) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-gray-700">{text}</span>
      <span
        className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[11px] font-semibold ${
          active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        {active ? "활성" : "만료"}
      </span>
    </div>
  );
}

export function ChurchesFeature() {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState(""); // 디바운스된 실제 검색어

  const [items, setItems] = useState<ChurchOverview[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const seqRef = useRef(0); // 검색어 변경 시 진행 중인 요청을 무효화하기 위한 토큰
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = items.length < totalCount;

  // 입력 디바운스 (300ms)
  useEffect(() => {
    const t = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // 검색어 변경 → 1페이지부터 다시 로드
  useEffect(() => {
    const seq = ++seqRef.current;
    setStatus("loading");
    setErrorMsg("");
    setLoadingMore(false);
    (async () => {
      try {
        const res = await onchurchMaster.listChurches({ keyword: query, page: 1, size: PAGE_SIZE });
        if (seq !== seqRef.current) return;
        setItems(res.items);
        setTotalCount(res.totalCount);
        setPage(1);
        setStatus("done");
      } catch (err) {
        if (seq !== seqRef.current) return;
        setStatus("error");
        setErrorMsg(err instanceof ApiError ? err.message : "교회 목록을 불러오지 못했습니다.");
      }
    })();
  }, [query]);

  // 다음 페이지 로드 (이어붙이기)
  const loadMore = useCallback(async () => {
    if (loadingMore || status !== "done") return;
    const seq = seqRef.current;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await onchurchMaster.listChurches({ keyword: query, page: next, size: PAGE_SIZE });
      if (seq !== seqRef.current) return;
      setItems((prev) => [...prev, ...res.items]);
      setTotalCount(res.totalCount);
      setPage(next);
    } catch {
      // 추가 로드 실패는 조용히 무시 — 다음 스크롤에서 재시도
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, status, page, query]);

  // 무한 스크롤: 하단 센티넬이 보이면 다음 페이지 로드
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

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">교회 확인</h2>
      <p className="mt-1 text-sm text-gray-500">
        등록된 교회와 소유자, 프리티어·결제 현황을 확인할 수 있습니다.
        {status === "done" && <span className="ml-1 text-gray-400">(총 {totalCount}곳)</span>}
      </p>

      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="교회명, 소유자명, 연락처 검색"
        className="mt-4 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
      />

      <div className="mt-4">
        {status === "loading" && <p className="text-sm text-gray-500">불러오는 중…</p>}
        {status === "error" && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}
        {status === "done" && items.length === 0 && (
          <p className="text-sm text-gray-500">{query ? "검색 결과가 없습니다." : "등록된 교회가 없습니다."}</p>
        )}

        {status !== "loading" && items.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500">
                  <th className="px-4 py-3">교회이름</th>
                  <th className="px-4 py-3">교회소유자이름</th>
                  <th className="px-4 py-3">소유자 연락처</th>
                  <th className="px-4 py-3">프리티어 기간</th>
                  <th className="px-4 py-3">결제기간</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="mt-0.5 text-xs text-gray-400">{c.slug}.everychurch.co.kr</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.ownerName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{c.ownerPhone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <PeriodCell
                        hasValue={!!c.freeTrialUntil}
                        active={c.isFreeTrialActive}
                        text={`${formatDate(c.freeTrialStartAt)} ~ ${formatDate(c.freeTrialUntil)}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <PeriodCell
                        hasValue={!!c.paidUntil}
                        active={c.isPaidActive}
                        text={`~ ${formatDate(c.paidUntil)}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 무한 스크롤 센티넬 */}
        {hasMore && <div ref={sentinelRef} className="h-1" />}
        {loadingMore && <p className="py-2 text-center text-xs text-gray-400">더 불러오는 중…</p>}
      </div>
    </div>
  );
}
