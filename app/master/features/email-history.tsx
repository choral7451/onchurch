"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, onchurchMaster, type EmailLog } from "@/lib/api-client";
import { buildPreviewHtml, EMAIL_BODY_STYLE } from "./email-html";

const PAGE_SIZE = 20;

type LoadStatus = "loading" | "done" | "error";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EmailHistoryFeature({ reloadKey = 0 }: { reloadKey?: number }) {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState(""); // 디바운스된 실제 검색어

  const [items, setItems] = useState<EmailLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const seqRef = useRef(0); // 검색어/리로드 변경 시 진행 중인 요청을 무효화하기 위한 토큰
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = items.length < totalCount;

  // 입력 디바운스 (300ms)
  useEffect(() => {
    const t = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // 검색어 또는 발송(reloadKey) 변경 → 1페이지부터 다시 로드
  useEffect(() => {
    const seq = ++seqRef.current;
    setStatus("loading");
    setErrorMsg("");
    setLoadingMore(false);
    (async () => {
      try {
        const res = await onchurchMaster.listEmailLogs({ keyword: query, page: 1, size: PAGE_SIZE });
        if (seq !== seqRef.current) return;
        setItems(res.items);
        setTotalCount(res.totalCount);
        setPage(1);
        setStatus("done");
      } catch (err) {
        if (seq !== seqRef.current) return;
        setStatus("error");
        setErrorMsg(err instanceof ApiError ? err.message : "내역을 불러오지 못했습니다.");
      }
    })();
  }, [query, reloadKey]);

  // 다음 페이지 로드 (이어붙이기)
  const loadMore = useCallback(async () => {
    if (loadingMore || status !== "done") return;
    const seq = seqRef.current;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await onchurchMaster.listEmailLogs({ keyword: query, page: next, size: PAGE_SIZE });
      if (seq !== seqRef.current) return; // 검색어가 바뀌었으면 폐기
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
      <h2 className="text-xl font-bold text-gray-900">메일 발송 내역</h2>
      <p className="mt-1 text-sm text-gray-500">누구에게 어떤 내용의 메일을 보냈는지 확인할 수 있습니다.</p>

      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="이메일 주소, 제목, 내용 검색"
        className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
      />

      <div className="mt-4 space-y-3">
        {status === "loading" && <p className="text-sm text-gray-500">불러오는 중…</p>}
        {status === "error" && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
        )}
        {status === "done" && items.length === 0 && (
          <p className="text-sm text-gray-500">{query ? "검색 결과가 없습니다." : "아직 발송 내역이 없습니다."}</p>
        )}

        {items.map((log) => {
          const open = openId === log.id;
          return (
            <div key={log.id} className="rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : log.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{log.subject}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDate(log.createdAt)} · {log.senderName} · 수신자 {log.total}명
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-500">
                  성공 {log.sent} / 제외 {log.excluded} / 실패 {log.failed}
                </span>
              </button>

              {open && (
                <div className="space-y-4 border-t border-gray-100 px-4 py-4">
                  {(() => {
                    const succeeded = log.results.filter((r) => r.status === "sent");
                    const excludedList = log.results.filter((r) => r.status === "excluded");
                    const failedList = log.results.filter((r) => r.status === "failed");
                    return (
                      <>
                        {succeeded.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-700">성공 ({succeeded.length}명)</p>
                            <p className="mt-1 break-all text-sm text-gray-700">
                              {succeeded.map((r) => r.email).join(", ")}
                            </p>
                          </div>
                        )}
                        {excludedList.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-amber-700">제외 ({excludedList.length}명)</p>
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-700">
                              {excludedList.map((r) => (
                                <li key={r.email}>
                                  {r.email} — {r.reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {failedList.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-600">실패 ({failedList.length}명)</p>
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-red-600">
                              {failedList.map((r) => (
                                <li key={r.email}>
                                  {r.email} — {r.reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div>
                    <p className="text-xs font-semibold text-gray-500">본문</p>
                    <div
                      style={EMAIL_BODY_STYLE}
                      className="mt-1 break-words rounded-lg bg-gray-50 px-3 py-2"
                      dangerouslySetInnerHTML={{ __html: buildPreviewHtml(log.content) }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 무한 스크롤 센티넬 */}
        {hasMore && <div ref={sentinelRef} className="h-1" />}
        {loadingMore && <p className="py-2 text-center text-xs text-gray-400">더 불러오는 중…</p>}
      </div>
    </div>
  );
}
