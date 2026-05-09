"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  onchurchWorshipService,
  onchurchWorshipOrder,
  type WorshipServiceItem,
  type WorshipServiceWriteInput,
  type WorshipServiceTag,
  type WorshipOrderItem,
  type WorshipOrderWriteInput,
} from "@/lib/api-client";

type Status = "idle" | "loading" | "saving" | "deleting";

const TAGS: WorshipServiceTag[] = ["MAIN", "WEEK", "DAILY"];

const EMPTY_SERVICE: WorshipServiceWriteInput = {
  tag: "MAIN",
  name: "",
  time: "",
  meta: "",
  isFeatured: false,
  sortOrder: 0,
  isActive: true,
};

const EMPTY_ORDER: WorshipOrderWriteInput = {
  no: "",
  item: "",
  leader: "",
  sortOrder: 0,
  isActive: true,
};

type WorshipEditorProps = {
  orderVisible: boolean;
  onToggleOrderVisible: (on: boolean) => void;
  onChanged?: () => void;
};

type SubKey = "services" | "orders";

export function WorshipEditor({ orderVisible, onToggleOrderVisible, onChanged }: WorshipEditorProps) {
  const [section, setSection] = useState<SubKey>("services");

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">WORSHIP</div>
        <h2>예배 안내 <span className="admin-sidebar-pill complete" style={{ fontSize: 10, marginLeft: 8, verticalAlign: "middle" }}>필수</span></h2>
        <p>예배 시간표는 필수입니다. 예배 순서는 공개 여부를 선택할 수 있습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="chips">
          {(["services", "orders"] as const).map((s) => {
            const isServices = s === "services";
            const isOn = isServices ? true : orderVisible;
            const label = isServices ? "예배 시간표" : "예배 순서";
            return (
              <div
                key={s}
                className={`chip ${section === s ? "active" : ""}`}
                onClick={() => setSection(s)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <span>{label}</span>
                {isServices ? (
                  <span className="required-mark" aria-hidden="true">*</span>
                ) : (
                  <span className={`admin-sidebar-pill ${isOn ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                    {isOn ? "공개" : "비공개"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {section === "services" && <WorshipServicesEditor onChanged={onChanged} />}
        {section === "orders" && (
          <WorshipOrdersEditor visible={orderVisible} onToggleVisible={onToggleOrderVisible} />
        )}
      </div>
    </section>
  );
}

function SectionVisibilityToggle({ label, visible, onToggle }: { label: string; visible: boolean; onToggle: (on: boolean) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        background: visible ? "var(--surface)" : "var(--bg-tinted)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <strong style={{ fontSize: 14 }}>{label} 섹션 공개</strong>
        <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
          {visible ? "사이트 방문자에게 노출됩니다." : "관리자만 볼 수 있고 공개 페이지에서는 숨겨집니다."}
        </span>
      </div>
      <button
        type="button"
        className={`toggle ${visible ? "on" : ""}`}
        onClick={() => onToggle(!visible)}
        aria-pressed={visible}
        aria-label={`${label} 섹션 공개 토글`}
      />
    </div>
  );
}

function WorshipServicesEditor({ onChanged }: { onChanged?: () => void }) {
  const [items, setItems] = useState<WorshipServiceItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<WorshipServiceWriteInput>(EMPTY_SERVICE);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");

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
      isActive: it.isActive,
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
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchWorshipService.create(payload);
      else await onchurchWorshipService.update(editing, payload);
      cancel(); await load();
      onChanged?.();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 예배 항목을 삭제할까요?")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchWorshipService.remove(id); await load(); onChanged?.(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
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
              <label>정렬</label>
              <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })} />
            </div>
            <div className="form-row">
              <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                <input type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} />
                <span>대표 예배</span>
              </label>
            </div>
            <div className="form-row">
              <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                <span>활성</span>
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
        {items.map((it) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="admin-sidebar-pill complete" style={{ fontSize: 10 }}>{it.tag}</span>
                <strong>{it.name}</strong>
                {it.isFeatured && <span className="admin-sidebar-pill complete" style={{ fontSize: 10 }}>대표</span>}
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>순서 {it.sortOrder}</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {it.time}
                {it.meta && <> · {it.meta}</>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
              <button type="button" className="btn btn-ghost" onClick={() => startEdit(it)} disabled={editing !== null}>편집</button>
              <button type="button" className="btn btn-ghost" onClick={() => remove(it.id)} disabled={status === "deleting"}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorshipOrdersEditor({ visible, onToggleVisible }: { visible: boolean; onToggleVisible: (on: boolean) => void }) {
  const [items, setItems] = useState<WorshipOrderItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<WorshipOrderWriteInput>(EMPTY_ORDER);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchWorshipOrder.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "예배 순서를 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() {
    const nextNum = String(items.length + 1).padStart(2, "0");
    setEditing(0);
    setDraft({ ...EMPTY_ORDER, no: nextNum, sortOrder: items.length });
  }
  function startEdit(it: WorshipOrderItem) {
    setEditing(it.id);
    setDraft({ no: it.no, item: it.item, leader: it.leader ?? "", sortOrder: it.sortOrder, isActive: it.isActive });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_ORDER); setErrMsg(""); }

  async function save() {
    if (!draft.no.trim() || !draft.item.trim()) {
      setErrMsg("순서 번호와 항목은 필수입니다.");
      return;
    }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: WorshipOrderWriteInput = {
        no: draft.no.trim(),
        item: draft.item.trim(),
        leader: (draft.leader ?? "").trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchWorshipOrder.create(payload);
      else await onchurchWorshipOrder.update(editing, payload);
      cancel(); await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 순서 항목을 삭제할까요?")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchWorshipOrder.remove(id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionVisibilityToggle label="예배 순서" visible={visible} onToggle={onToggleVisible} />
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 순서 추가</button>
      </div>
      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row">
              <label>번호 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.no} onChange={(e) => setDraft({ ...draft, no: e.target.value })} placeholder="01" required />
            </div>
            <div className="form-row">
              <label>항목 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.item} onChange={(e) => setDraft({ ...draft, item: e.target.value })} placeholder="예배의 부름" required />
            </div>
            <div className="form-row">
              <label>담당</label>
              <input value={draft.leader ?? ""} onChange={(e) => setDraft({ ...draft, leader: e.target.value })} placeholder="사회자" />
            </div>
            <div className="form-row">
              <label>정렬</label>
              <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })} />
            </div>
            <div className="form-row">
              <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                <span>활성</span>
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>취소</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.no.trim() || !draft.item.trim()}>
              {status === "saving" ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
        {status !== "loading" && items.length === 0 && editing === null && (
          <p style={{ color: "var(--muted)" }}>등록된 순서가 없습니다.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <strong>{it.no}</strong>
                <span>· {it.item}</span>
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
              </div>
              {it.leader && <div style={{ color: "var(--muted)", fontSize: 13 }}>{it.leader}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
              <button type="button" className="btn btn-ghost" onClick={() => startEdit(it)} disabled={editing !== null}>편집</button>
              <button type="button" className="btn btn-ghost" onClick={() => remove(it.id)} disabled={status === "deleting"}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
