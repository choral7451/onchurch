"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, onchurchMaster, type ChurchOverview, type OwnerCandidate } from "@/lib/api-client";

const ROLE_LABEL: Record<OwnerCandidate["role"], string> = {
  master: "마스터",
  owner: "교회 소유자",
  admin: "관리자",
  member: "멤버",
};

// 교회 소유자를 기존 가입자에게 이관하는 모달.
// 대상 검색(이름·아이디·연락처) → 선택 → 확인 시 이관. 기존 오너는 일반 멤버로 강등된다.
export function TransferOwnerModal({
  church,
  onClose,
  onTransferred,
}: {
  church: ChurchOverview;
  onClose: () => void;
  onTransferred: (ownerName: string, ownerPhone: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<OwnerCandidate[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [selected, setSelected] = useState<OwnerCandidate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const seqRef = useRef(0);

  // 입력 디바운스 (300ms)
  useEffect(() => {
    const t = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // 검색어 변경 → 후보 로드
  useEffect(() => {
    if (!query) {
      setItems([]);
      setStatus("idle");
      return;
    }
    const seq = ++seqRef.current;
    setStatus("loading");
    setErrorMsg("");
    (async () => {
      try {
        const res = await onchurchMaster.searchUsers(query);
        if (seq !== seqRef.current) return;
        setItems(res.items);
        setStatus("idle");
      } catch (err) {
        if (seq !== seqRef.current) return;
        setStatus("error");
        setErrorMsg(err instanceof ApiError ? err.message : "사용자를 검색하지 못했습니다.");
      }
    })();
  }, [query]);

  async function handleTransfer() {
    if (!selected) return;
    const ok = window.confirm(
      `'${church.name}'의 소유자를 '${selected.name}'(으)로 이관합니다.\n기존 소유자(${church.ownerName ?? "미상"})는 이 교회의 일반 멤버로 강등됩니다.\n계속할까요?`,
    );
    if (!ok) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await onchurchMaster.transferChurchOwner(church.id, selected.id);
      onTransferred(res.ownerName, res.ownerPhone);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "이관에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">교회 소유자 이관</h3>
            <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-700">
              ✕
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{church.name}</span> · 현재 소유자 {church.ownerName ?? "미상"}
          </p>
        </div>

        {/* 검색 */}
        <div className="border-b border-gray-100 px-5 py-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="새 소유자 검색 (이름·아이디·연락처)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            autoFocus
          />
        </div>

        {/* 후보 목록 */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {status === "loading" && <p className="text-sm text-gray-500">검색 중…</p>}
          {status === "error" && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}
          {status === "idle" && !query && <p className="text-sm text-gray-400">이름·아이디·연락처로 검색하세요.</p>}
          {status === "idle" && query && items.length === 0 && (
            <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
          )}

          <div className="space-y-1">
            {items.map((u) => {
              const isOwner = u.role === "owner";
              const checked = selected?.id === u.id;
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    isOwner ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-gray-50"
                  } ${checked ? "bg-gray-50 ring-1 ring-gray-900" : ""}`}
                >
                  <input
                    type="radio"
                    name="transfer-target"
                    disabled={isOwner}
                    checked={checked}
                    onChange={() => setSelected(u)}
                    className="h-4 w-4 border-gray-300 accent-gray-900"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-gray-900">{u.name}</span>
                      <span className="inline-flex shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500">
                        {ROLE_LABEL[u.role]}
                      </span>
                      {isOwner && <span className="shrink-0 text-[11px] text-gray-400">이미 다른 교회 소유자</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {u.loginId} · {u.phone}
                      {u.churchName ? ` · ${u.churchName}` : ""}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
          <span className="text-xs text-gray-500">
            {selected ? `'${selected.name}' 선택됨` : "기존 소유자는 일반 멤버로 강등됩니다."}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleTransfer}
              disabled={!selected || submitting}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "이관 중…" : "이관"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
