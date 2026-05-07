"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  onchurchPastor,
  onchurchVision,
  onchurchHistory,
  onchurchStaff,
  type Pastor,
  type PastorWriteInput,
  type VisionItem,
  type VisionWriteInput,
  type HistoryItem,
  type HistoryWriteInput,
  type StaffMember,
  type StaffWriteInput,
} from "@/lib/api-client";

type SectionKey = "pastor" | "vision" | "history" | "staff";

const EMPTY_PASTOR: PastorWriteInput = {
  name: "",
  role: "담임목사",
  eng: "",
  message: "",
  longMessage: "",
  photoUrl: "",
};

const EMPTY_VISION: VisionWriteInput = { ko: "", en: "", description: "", sortOrder: 0, isActive: true };
const EMPTY_HISTORY: HistoryWriteInput = { year: "", title: "", description: "", sortOrder: 0, isActive: true };
const EMPTY_STAFF: StaffWriteInput = { name: "", role: "", area: "", photoUrl: "", sortOrder: 0, isActive: true };

type Status = "idle" | "loading" | "saving" | "deleting";

export function AboutEditor() {
  const [section, setSection] = useState<SectionKey>("pastor");

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">ABOUT</div>
        <h2>교회 소개</h2>
        <p>담임목사 인사말 · 비전 · 연혁 · 교역자를 관리합니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="chips">
          {(["pastor", "vision", "history", "staff"] as const).map((s) => (
            <div key={s} className={`chip ${section === s ? "active" : ""}`} onClick={() => setSection(s)}>
              {s === "pastor" ? "담임목사" : s === "vision" ? "비전" : s === "history" ? "연혁" : "교역자"}
            </div>
          ))}
        </div>

        {section === "pastor" && <PastorEditor />}
        {section === "vision" && <VisionEditor />}
        {section === "history" && <HistoryEditor />}
        {section === "staff" && <StaffEditor />}
      </div>
    </section>
  );
}

function PastorEditor() {
  const [pastor, setPastor] = useState<Pastor | null>(null);
  const [draft, setDraft] = useState<PastorWriteInput>(EMPTY_PASTOR);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [savedMsg, setSavedMsg] = useState<string>("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await onchurchPastor.getMine();
      setPastor(res.pastor);
      if (res.pastor) {
        setDraft({
          name: res.pastor.name,
          role: res.pastor.role ?? "",
          eng: res.pastor.eng ?? "",
          message: res.pastor.message ?? "",
          longMessage: res.pastor.longMessage ?? "",
          photoUrl: res.pastor.photoUrl ?? "",
        });
      }
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "담임목사 정보를 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  async function save() {
    if (!draft.name.trim()) {
      setErrMsg("이름은 필수입니다.");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    setSavedMsg("");
    try {
      const updated = await onchurchPastor.upsertMine({
        name: draft.name.trim(),
        role: (draft.role ?? "").trim() || null,
        eng: (draft.eng ?? "").trim() || null,
        message: draft.message ?? null,
        longMessage: draft.longMessage ?? null,
        photoUrl: (draft.photoUrl ?? "").trim() || null,
      });
      setPastor(updated);
      setSavedMsg("저장되었습니다.");
      setTimeout(() => setSavedMsg(""), 2000);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  if (status === "loading") return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      {savedMsg && <div className="phone-msg phone-msg-success">{savedMsg}</div>}
      <div className="form-grid">
        <div className="form-row">
          <label>이름 <span className="required-mark" aria-hidden="true">*</span></label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="홍길동" required />
        </div>
        <div className="form-row">
          <label>직책</label>
          <input value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="담임목사" />
        </div>
        <div className="form-row">
          <label>영문 이름</label>
          <input value={draft.eng ?? ""} onChange={(e) => setDraft({ ...draft, eng: e.target.value })} placeholder="HONG GIL-DONG" />
        </div>
        <div className="form-row">
          <label>사진 URL</label>
          <input value={draft.photoUrl ?? ""} onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })} placeholder="https://..." />
        </div>
        <div className="form-row full">
          <label>인사말 (요약)</label>
          <textarea rows={4} value={draft.message ?? ""} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
        </div>
        <div className="form-row full">
          <label>인사말 (상세)</label>
          <textarea rows={8} value={draft.longMessage ?? ""} onChange={(e) => setDraft({ ...draft, longMessage: e.target.value })} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.name.trim()}>
          {status === "saving" ? "저장 중..." : pastor ? "수정 저장" : "등록"}
        </button>
      </div>
    </div>
  );
}

function VisionEditor() {
  const [items, setItems] = useState<VisionItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<VisionWriteInput>(EMPTY_VISION);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchVision.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "비전 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() { setEditing(0); setDraft({ ...EMPTY_VISION, sortOrder: items.length }); }
  function startEdit(it: VisionItem) {
    setEditing(it.id);
    setDraft({ ko: it.ko, en: it.en ?? "", description: it.description ?? "", sortOrder: it.sortOrder, isActive: it.isActive });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_VISION); setErrMsg(""); }

  async function save() {
    if (!draft.ko.trim()) { setErrMsg("한글 키워드는 필수입니다."); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: VisionWriteInput = {
        ko: draft.ko.trim(),
        en: (draft.en ?? "").trim() || null,
        description: draft.description ?? null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchVision.create(payload);
      else await onchurchVision.update(editing, payload);
      cancel(); await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 비전 항목을 삭제할까요?")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchVision.remove(id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 비전 추가</button>
      </div>
      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row">
              <label>한글 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.ko} onChange={(e) => setDraft({ ...draft, ko: e.target.value })} placeholder="예배하는" required />
            </div>
            <div className="form-row">
              <label>영문</label>
              <input value={draft.en ?? ""} onChange={(e) => setDraft({ ...draft, en: e.target.value })} placeholder="WORSHIP" />
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
            <div className="form-row full">
              <label>설명</label>
              <textarea rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>취소</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.ko.trim()}>
              {status === "saving" ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
        {status !== "loading" && items.length === 0 && editing === null && (
          <p style={{ color: "var(--muted)" }}>등록된 비전이 없습니다.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <strong>{it.ko}</strong>
                {it.en && <span style={{ color: "var(--muted)", fontSize: 12 }}>· {it.en}</span>}
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>순서 {it.sortOrder}</span>
              </div>
              {it.description && <div style={{ color: "var(--muted)", fontSize: 13 }}>{it.description}</div>}
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

function HistoryEditor() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<HistoryWriteInput>(EMPTY_HISTORY);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchHistory.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "연혁 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() { setEditing(0); setDraft({ ...EMPTY_HISTORY, sortOrder: items.length }); }
  function startEdit(it: HistoryItem) {
    setEditing(it.id);
    setDraft({ year: it.year, title: it.title, description: it.description ?? "", sortOrder: it.sortOrder, isActive: it.isActive });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_HISTORY); setErrMsg(""); }

  async function save() {
    if (!draft.year.trim() || !draft.title.trim()) { setErrMsg("연도와 제목은 필수입니다."); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: HistoryWriteInput = {
        year: draft.year.trim(),
        title: draft.title.trim(),
        description: draft.description ?? null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchHistory.create(payload);
      else await onchurchHistory.update(editing, payload);
      cancel(); await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 연혁 항목을 삭제할까요?")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchHistory.remove(id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 연혁 추가</button>
      </div>
      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row">
              <label>연도 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} placeholder="1979" required />
            </div>
            <div className="form-row">
              <label>제목 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="교회 설립" required />
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
            <div className="form-row full">
              <label>설명</label>
              <textarea rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>취소</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.year.trim() || !draft.title.trim()}>
              {status === "saving" ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
        {status !== "loading" && items.length === 0 && editing === null && (
          <p style={{ color: "var(--muted)" }}>등록된 연혁이 없습니다.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <strong>{it.year}</strong>
                <span>· {it.title}</span>
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
              </div>
              {it.description && <div style={{ color: "var(--muted)", fontSize: 13 }}>{it.description}</div>}
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

function StaffEditor() {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<StaffWriteInput>(EMPTY_STAFF);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchStaff.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "교역자 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() { setEditing(0); setDraft({ ...EMPTY_STAFF, sortOrder: items.length }); }
  function startEdit(it: StaffMember) {
    setEditing(it.id);
    setDraft({ name: it.name, role: it.role ?? "", area: it.area ?? "", photoUrl: it.photoUrl ?? "", sortOrder: it.sortOrder, isActive: it.isActive });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_STAFF); setErrMsg(""); }

  async function save() {
    if (!draft.name.trim()) { setErrMsg("이름은 필수입니다."); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: StaffWriteInput = {
        name: draft.name.trim(),
        role: (draft.role ?? "").trim() || null,
        area: (draft.area ?? "").trim() || null,
        photoUrl: (draft.photoUrl ?? "").trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchStaff.create(payload);
      else await onchurchStaff.update(editing, payload);
      cancel(); await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 교역자 항목을 삭제할까요?")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchStaff.remove(id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 교역자 추가</button>
      </div>
      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row">
              <label>이름 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="홍길동" required />
            </div>
            <div className="form-row">
              <label>직책</label>
              <input value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="부목사" />
            </div>
            <div className="form-row">
              <label>담당 사역</label>
              <input value={draft.area ?? ""} onChange={(e) => setDraft({ ...draft, area: e.target.value })} placeholder="청년부" />
            </div>
            <div className="form-row">
              <label>사진 URL</label>
              <input value={draft.photoUrl ?? ""} onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })} placeholder="https://..." />
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
            <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.name.trim()}>
              {status === "saving" ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
        {status !== "loading" && items.length === 0 && editing === null && (
          <p style={{ color: "var(--muted)" }}>등록된 교역자가 없습니다.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <strong>{it.name}</strong>
                {it.role && <span style={{ color: "var(--muted)", fontSize: 12 }}>· {it.role}</span>}
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
              </div>
              {it.area && <div style={{ color: "var(--muted)", fontSize: 13 }}>{it.area}</div>}
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
