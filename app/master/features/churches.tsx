"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, onchurchMaster, type ChurchOverview } from "@/lib/api-client";
import { TransferOwnerModal } from "./transfer-owner-modal";

const PAGE_SIZE = 30;

type LoadStatus = "loading" | "done" | "error";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 구독 기간 문자열만 표시(활성 여부는 별도 '상태' 컬럼에서 표시).
function PeriodCell({ text, hasValue }: { text: string; hasValue: boolean }) {
  if (!hasValue) return <span className="text-gray-400">—</span>;
  return <span className="whitespace-nowrap text-gray-700">{text}</span>;
}

// 상태 배지: 프리티어 또는 결제 중 하나라도 유효하면 활성.
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
        active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? "활성" : "만료"}
    </span>
  );
}

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 결제 만료일 편집: 날짜 직접 선택 또는 1일/1달/1년 버튼으로 입력칸에 채운 뒤 '적용'으로 저장 + 해제.
function PaidUntilEditor({
  church,
  onUpdated,
}: {
  church: ChurchOverview;
  onUpdated: (id: number, paidUntil: string | null, isPaidActive: boolean) => void;
}) {
  const [draft, setDraft] = useState(church.paidUntil ? church.paidUntil.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save(dateStr: string | null) {
    setSaving(true);
    setErr("");
    try {
      const res = await onchurchMaster.updateChurchPaidUntil(church.id, dateStr);
      onUpdated(church.id, res.paidUntil, res.isPaidActive);
      setDraft(res.paidUntil ? res.paidUntil.slice(0, 10) : "");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  // 연장은 바로 저장하지 않고 날짜 입력칸(draft)에만 반영한다. '적용'을 눌러야 저장된다.
  // 기준:
  // 1) 입력칸에 이미 날짜가 있으면 그 값에 더한다(+버튼 연속 클릭 시 누적).
  // 2) 비어 있으면 결제 남은 기간(결제일이 미래)에 더한다.
  // 3) 결제 잔여가 없으면 프리티어 마지막일에 더한다(지난 날짜여도 그 날짜 기준).
  // 4) 프리티어 날짜도 없으면 오늘부터 더한다.
  function extend(unit: "day" | "month" | "year") {
    const now = new Date();
    const paidFuture = church.paidUntil && new Date(church.paidUntil) > now ? new Date(church.paidUntil) : null;
    const base = draft
      ? new Date(draft)
      : paidFuture ?? (church.freeTrialUntil ? new Date(church.freeTrialUntil) : now);
    if (unit === "day") base.setDate(base.getDate() + 1);
    if (unit === "month") base.setMonth(base.getMonth() + 1);
    if (unit === "year") base.setFullYear(base.getFullYear() + 1);
    setDraft(ymd(base));
  }

  const btn = "rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-40";

  return (
    <div className="flex min-w-[230px] flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {church.paidUntil ? (
          <span className="whitespace-nowrap text-gray-700">~ {formatDate(church.paidUntil)}</span>
        ) : (
          <span className="text-gray-400">미설정</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-[140px] rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none"
        />
        <button type="button" onClick={() => save(draft || null)} disabled={saving || !draft} className={btn}>
          적용
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={() => extend("day")} disabled={saving} className={btn}>
          +1일
        </button>
        <button type="button" onClick={() => extend("month")} disabled={saving} className={btn}>
          +1달
        </button>
        <button type="button" onClick={() => extend("year")} disabled={saving} className={btn}>
          +1년
        </button>
        {church.paidUntil && (
          <button
            type="button"
            onClick={() => save(null)}
            disabled={saving}
            className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-40"
          >
            해제
          </button>
        )}
      </div>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  );
}

function NaverVerificationEditor({
  church,
  onUpdated,
}: {
  church: ChurchOverview;
  onUpdated: (id: number, naverVerification: string | null) => void;
}) {
  const [draft, setDraft] = useState(church.naverVerification ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const dirty = draft.trim() !== (church.naverVerification ?? "");

  async function save(value: string | null) {
    setSaving(true);
    setErr("");
    try {
      const res = await onchurchMaster.updateChurchNaverVerification(church.id, value);
      onUpdated(church.id, res.naverVerification);
      setDraft(res.naverVerification ?? "");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const btn = "rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-40";

  return (
    <div className="flex min-w-[240px] flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="네이버 인증 코드"
          className="w-[180px] rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none"
        />
        <button type="button" onClick={() => save(draft.trim() || null)} disabled={saving || !dirty} className={btn}>
          저장
        </button>
        {church.naverVerification && (
          <button
            type="button"
            onClick={() => save(null)}
            disabled={saving}
            className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-40"
          >
            해제
          </button>
        )}
      </div>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  );
}

export function ChurchesFeature() {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState(""); // 디바운스된 실제 검색어
  const [publishedOnly, setPublishedOnly] = useState(true); // 기본: 운영중인 교회만

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

  // 검색어 또는 필터 변경 → 1페이지부터 다시 로드
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
        setErrorMsg(err instanceof ApiError ? err.message : "교회 목록을 불러오지 못했습니다.");
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
      // 추가 로드 실패는 조용히 무시 — 다음 스크롤에서 재시도
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, status, page, query, publishedOnly]);

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

  // 결제 만료일 변경 후 해당 행만 갱신
  const handlePaidUpdated = useCallback((id: number, paidUntil: string | null, isPaidActive: boolean) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, paidUntil, isPaidActive } : c)));
  }, []);

  // 네이버 인증 코드 변경 후 해당 행만 갱신
  const handleNaverUpdated = useCallback((id: number, naverVerification: string | null) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, naverVerification } : c)));
  }, []);

  // 소유자 이관 모달 대상 교회
  const [transferTarget, setTransferTarget] = useState<ChurchOverview | null>(null);

  // 이관 완료 후 해당 행의 소유자 정보만 갱신
  const handleTransferred = useCallback((churchId: number, ownerName: string, ownerPhone: string) => {
    setItems((prev) => prev.map((c) => (c.id === churchId ? { ...c, ownerName, ownerPhone } : c)));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">교회 확인</h2>
      <p className="mt-1 text-sm text-gray-500">
        등록된 교회와 소유자, 프리티어·결제 현황을 확인할 수 있습니다.
        {status === "done" && <span className="ml-1 text-gray-400">(총 {totalCount}곳)</span>}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="교회명, 소유자명, 연락처 검색"
          className="w-full max-w-md flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
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

      <div className="mt-4">
        {status === "loading" && <p className="text-sm text-gray-500">불러오는 중…</p>}
        {status === "error" && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}
        {status === "done" && items.length === 0 && (
          <p className="text-sm text-gray-500">{query ? "검색 결과가 없습니다." : "등록된 교회가 없습니다."}</p>
        )}

        {status !== "loading" && items.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[1280px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 [&>th]:whitespace-nowrap">
                  <th className="px-4 py-3">교회이름</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">주소</th>
                  <th className="px-4 py-3">교회소유자이름</th>
                  <th className="px-4 py-3">소유자 연락처</th>
                  <th className="px-4 py-3">프리티어 기간</th>
                  <th className="px-4 py-3">결제기간</th>
                  <th className="px-4 py-3">네이버 인증</th>
                  <th className="px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="whitespace-nowrap font-semibold text-gray-900">{c.name}</span>
                        {!c.isPublished && (
                          <span className="inline-flex shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500">
                            미운영
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400">{c.slug}.everychurch.co.kr</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={c.isFreeTrialActive || c.isPaidActive} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="max-w-[220px] truncate" title={c.address ?? undefined}>
                        {c.address ?? "—"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{c.ownerName ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{c.ownerPhone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <PeriodCell
                        hasValue={!!c.freeTrialUntil}
                        text={`${formatDate(c.freeTrialStartAt)} ~ ${formatDate(c.freeTrialUntil)}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <PaidUntilEditor church={c} onUpdated={handlePaidUpdated} />
                    </td>
                    <td className="px-4 py-3">
                      <NaverVerificationEditor church={c} onUpdated={handleNaverUpdated} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://${c.slug}.everychurch.co.kr`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whitespace-nowrap rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                          홈페이지
                        </a>
                        <button
                          type="button"
                          onClick={() => setTransferTarget(c)}
                          className="whitespace-nowrap rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                          오너 이관
                        </button>
                      </div>
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

      {transferTarget && (
        <TransferOwnerModal
          church={transferTarget}
          onClose={() => setTransferTarget(null)}
          onTransferred={(ownerName, ownerPhone) => handleTransferred(transferTarget.id, ownerName, ownerPhone)}
        />
      )}
    </div>
  );
}
