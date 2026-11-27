"use client";

import { useState } from "react";
import { ApiError, onchurchMaster, type BrokenSermon, type ChurchOverview } from "@/lib/api-client";

// 교회 설교 중 영상이 안 나오는 것(링크 없음 · 유튜브에서 삭제/비공개)을 찾아 한 번에 지운다.
// 서버가 한 번에 50개씩 유튜브에 확인하고, 이 화면이 이어 부른다.
const BATCH = 50;
const REASON: Record<BrokenSermon["reason"], string> = { "no-link": "영상 링크 없음", unavailable: "유튜브에서 볼 수 없음" };

export function BrokenSermonsTool({ church }: { church: ChurchOverview }) {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState({ done: 0, total: 0 });
  const [broken, setBroken] = useState<BrokenSermon[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function find() {
    setMessage("");
    setChecking(true);
    setBroken(null);
    const found: BrokenSermon[] = [];
    let offset: number | null = 0;
    try {
      while (offset !== null) {
        const res = await onchurchMaster.findBrokenSermons(church.id, offset, BATCH);
        found.push(...res.broken);
        setChecked({ done: offset + res.checked, total: res.total });
        offset = res.nextOffset;
      }
      setBroken(found);
      setSelected(new Set(found.map((b) => b.id)));
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "확인하지 못했습니다.");
    } finally {
      setChecking(false);
    }
  }

  async function remove() {
    const ids = [...selected];
    if (ids.length === 0 || !confirm(`${church.name} 설교 ${ids.length}개를 삭제할까요?\n홈페이지와 관리자 화면에서 사라집니다.`)) return;
    setDeleting(true);
    setMessage("");
    try {
      const res = await onchurchMaster.deleteSermonsAsMaster(church.id, ids);
      setBroken((prev) => prev?.filter((b) => !selected.has(b.id)) ?? null);
      setSelected(new Set());
      setMessage(`설교 ${res.deleted}개를 삭제했습니다.`);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900">영상이 안 나오는 설교 정리</h3>
      <p className="mt-1 text-sm text-gray-500">영상 링크가 없거나 유튜브에서 삭제·비공개된 설교를 찾아 지웁니다.</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-40" onClick={() => void find()} disabled={checking || deleting}>
          {checking ? `확인 중… ${checked.done}/${checked.total || "?"}` : "찾기"}
        </button>
        {broken && broken.length > 0 && (
          <button type="button" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" onClick={() => void remove()} disabled={deleting || selected.size === 0}>
            {deleting ? "삭제 중…" : `선택한 ${selected.size}개 삭제`}
          </button>
        )}
      </div>
      {message && <p className="mt-3 text-sm text-gray-700" role="status">{message}</p>}
      {broken && broken.length === 0 && !message && <p className="mt-3 text-sm text-gray-700">영상이 안 나오는 설교가 없습니다.</p>}
      {broken && broken.length > 0 && (
        <ul className="mt-3 max-h-80 divide-y divide-gray-100 overflow-auto rounded-lg border border-gray-200 text-sm">
          {broken.map((b) => (
            <li key={b.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
                <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
                <span className="w-24 shrink-0 text-gray-500">{b.date ?? "—"}</span>
                <span className="flex-1 truncate text-gray-900">{b.title}</span>
                <span className="shrink-0 text-xs text-gray-500">{REASON[b.reason]}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
