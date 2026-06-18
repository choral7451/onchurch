"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, onchurchMaster, type ChurchOverview } from "@/lib/api-client";

const PAGE_SIZE = 30;

type LoadStatus = "loading" | "done" | "error";

// 교회 소유자(연락처 보유)를 검색·선택해 휴대폰 번호 목록을 반환하는 모달.
export function OwnerPicker({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (phones: string[]) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [publishedOnly, setPublishedOnly] = useState(false); // 기본: 전체 소유자

  const [items, setItems] = useState<ChurchOverview[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set()); // 선택된 휴대폰 번호

  const seqRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = items.length < totalCount;

  // 입력 디바운스 (300ms)
  useEffect(() => {
    const t = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // 검색어/필터 변경 → 1페이지부터 다시 로드
  useEffect(() => {
    const seq = ++seqRef.current;
    setStatus("loading");
    setErrorMsg("");
    setLoadingMore(false);
    (async () => {
      try {
        const res = await onchurchMaster.listChurches({ keyword: query, publishedOnly, page: 1, size: PAGE_SIZE });
        if (seq !== seqRef.current) return;
        setItems(res.items);
        setTotalCount(res.totalCount);
        setPage(1);
        setStatus("done");
      } catch (err) {
        if (seq !== seqRef.current) return;
        setStatus("error");
        setErrorMsg(err instanceof ApiError ? err.message : "소유자 목록을 불러오지 못했습니다.");
      }
    })();
  }, [query, publishedOnly]);

  // 다음 페이지 로드 (이어붙이기)
  const loadMore = useCallback(async () => {
    if (loadingMore || status !== "done") return;
    const seq = seqRef.current;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await onchurchMaster.listChurches({ keyword: query, publishedOnly, page: next, size: PAGE_SIZE });
      if (seq !== seqRef.current) return;
      setItems((prev) => [...prev, ...res.items]);
      setTotalCount(res.totalCount);
      setPage(next);
    } catch {
      // 추가 로드 실패는 조용히 무시
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, status, page, query, publishedOnly]);

  // 무한 스크롤: 모달 스크롤 영역 내 센티넬이 보이면 다음 페이지 로드
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: scrollRef.current, rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  function toggle(phone: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(selected));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">교회 소유자에서 수신자 선택</h3>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* 검색/필터 */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="교회명, 소유자명, 연락처 검색"
            className="w-full max-w-xs flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
          <label className="flex shrink-0 cursor-pointer select-none items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={publishedOnly}
              onChange={(e) => setPublishedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-gray-900"
            />
            운영중인 교회만
          </label>
        </div>

        {/* 목록 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3">
          {status === "loading" && <p className="text-sm text-gray-500">불러오는 중…</p>}
          {status === "error" && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}
          {status === "done" && items.length === 0 && (
            <p className="text-sm text-gray-500">{query ? "검색 결과가 없습니다." : "교회가 없습니다."}</p>
          )}

          <div className="space-y-1">
            {items.map((c) => {
              const phone = c.ownerPhone;
              const hasPhone = !!phone;
              const checked = hasPhone && selected.has(phone);
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    hasPhone ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!hasPhone}
                    checked={checked}
                    onChange={() => hasPhone && toggle(phone)}
                    className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-gray-900">{c.name}</span>
                      {!c.isPublished && (
                        <span className="inline-flex shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500">
                          미운영
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {c.ownerName ?? "소유자 미상"} · {phone ?? "연락처 없음"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {hasMore && <div ref={sentinelRef} className="h-1" />}
          {loadingMore && <p className="py-2 text-center text-xs text-gray-400">더 불러오는 중…</p>}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
          <span className="text-sm text-gray-500">{selected.size}명 선택됨</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selected.size}명 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
