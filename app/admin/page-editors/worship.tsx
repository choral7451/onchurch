"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  onchurchWorshipService,
  type WorshipServiceItem,
  type WorshipServiceWriteInput,
  type WorshipServiceTag,
} from "@/lib/api-client";
import { DragHandle } from "@/components/admin/drag-handle";
import { useDragSort } from "@/lib/use-drag-sort";
import { applyReorder } from "@/lib/admin-reorder";

type Status = "idle" | "loading" | "saving" | "deleting";

const TAGS: WorshipServiceTag[] = ["WEEK", "DAILY"];

const EMPTY_SERVICE: WorshipServiceWriteInput = {
  tag: "WEEK",
  name: "",
  time: "",
  meta: "",
  isFeatured: false,
  sortOrder: 0,
  isActive: true,
};

type WorshipEditorProps = {
  onChanged?: () => void;
};

export function WorshipEditor({ onChanged }: WorshipEditorProps) {
  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">WORSHIP</div>
        <h2>예배 안내 <span className="admin-sidebar-pill complete" style={{ fontSize: 10, marginLeft: 8, verticalAlign: "middle" }}>필수</span></h2>
        <p>예배 시간표를 등록하세요. 등록한 항목은 모두 사이트에 노출되며, 숨기려면 삭제하세요.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <WorshipServicesEditor onChanged={onChanged} />
      </div>
    </section>
  );
}

function WorshipServicesEditor({ onChanged }: { onChanged?: () => void }) {
  const [items, setItems] = useState<WorshipServiceItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<WorshipServiceWriteInput>(EMPTY_SERVICE);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [pendingDelete, setPendingDelete] = useState<WorshipServiceItem | null>(null);
  const dragDisabled = editing !== null || status === "saving" || status === "deleting";
  const { getItemProps } = useDragSort(items.length, (f, t) => void move(f, t));

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchWorshipService.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "예배 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() { setEditing(0); setDraft({ ...EMPTY_SERVICE, sortOrder: items.length }); }
  function startEdit(it: WorshipServiceItem) {
    setEditing(it.id);
    setDraft({
      tag: it.tag,
      name: it.name,
      time: it.time,
      meta: it.meta ?? "",
      isFeatured: it.isFeatured,
      sortOrder: it.sortOrder,
      isActive: true,
    });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_SERVICE); setErrMsg(""); }

  async function save() {
    if (!draft.name.trim() || !draft.time.trim()) {
      setErrMsg("이름과 시간은 필수입니다.");
      return;
    }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: WorshipServiceWriteInput = {
        tag: draft.tag,
        name: draft.name.trim(),
        time: draft.time.trim(),
        meta: (draft.meta ?? "").trim() || null,
        isFeatured: !!draft.isFeatured,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: true,
      };
      if (editing === 0 || editing === null) await onchurchWorshipService.create(payload);
      else await onchurchWorshipService.update(editing, payload);
      cancel(); await load();
      onChanged?.();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function confirmRemove() {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    setStatus("deleting"); setErrMsg("");
    try { await onchurchWorshipService.remove(target.id); await load(); onChanged?.(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function move(fromIndex: number, toIndex: number) {
    setStatus("saving"); setErrMsg("");
    try {
      await applyReorder(items, fromIndex, toIndex, (it, next) =>
        onchurchWorshipService.update(it.id, {
          tag: it.tag,
          name: it.name,
          time: it.time,
          meta: it.meta ?? null,
          isFeatured: it.isFeatured,
          sortOrder: next,
          isActive: true,
        }),
      );
      await load();
      onChanged?.();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "순서 변경에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 예배 추가</button>
      </div>
      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row">
              <label>구분 <span className="required-mark" aria-hidden="true">*</span></label>
              <select
                value={draft.tag}
                onChange={(e) => setDraft({ ...draft, tag: e.target.value as WorshipServiceTag })}
              >
                {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>이름 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="주일 1부 예배" required />
            </div>
            <div className="form-row">
              <label>시간 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} placeholder="오전 09:00" required />
            </div>
            <div className="form-row">
              <label>부가 정보</label>
              <input value={draft.meta ?? ""} onChange={(e) => setDraft({ ...draft, meta: e.target.value })} placeholder="본당 · 1시간 30분" />
            </div>
            <div className="form-row">
              <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                <input type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} />
                <span>대표 예배</span>
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>취소</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.name.trim() || !draft.time.trim()}>
              {status === "saving" ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
        {status !== "loading" && items.length === 0 && editing === null && (
          <p style={{ color: "var(--muted)" }}>등록된 예배가 없습니다.</p>
        )}
        {items.map((it, idx) => (
          <div
            key={it.id}
            className="admin-banner-card"
            {...(dragDisabled ? {} : getItemProps(idx))}
          >
            <DragHandle disabled={dragDisabled} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span className="admin-sidebar-pill complete" style={{ fontSize: 10 }}>{it.tag}</span>
                <strong>{it.name}</strong>
                {it.isFeatured && <span className="admin-sidebar-pill complete" style={{ fontSize: 10 }}>대표</span>}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {it.time}
                {it.meta && <> · {it.meta}</>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
              <button type="button" className="btn btn-ghost" onClick={() => startEdit(it)} disabled={editing !== null}>편집</button>
              <button type="button" className="btn btn-ghost" onClick={() => setPendingDelete(it)} disabled={status === "deleting"}>삭제</button>
            </div>
          </div>
        ))}
      </div>

      {pendingDelete && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setPendingDelete(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title">예배를 삭제할까요?</h3>
            <p className="admin-modal-body">
              <strong>{pendingDelete.name}</strong> 예배를 삭제하면, 이 예배와 관련된 <strong>성도 출석 정보도 함께 삭제</strong>됩니다.<br />
              <span style={{ color: "var(--muted)", fontSize: 13 }}>삭제된 출석 기록은 복구할 수 없습니다.</span>
            </p>
            <div className="admin-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPendingDelete(null)}>취소</button>
              <button type="button" className="btn btn-primary" onClick={() => void confirmRemove()}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
