"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  onchurchSermon,
  onchurchSermonSeries,
  type SermonItem,
  type SermonWriteInput,
  type SermonSeriesItem,
  type SermonSeriesWriteInput,
} from "@/lib/api-client";

type Status = "idle" | "loading" | "saving" | "deleting";

const EMPTY_SERMON: SermonWriteInput = {
  seriesId: null,
  title: "",
  pastor: "",
  date: "",
  duration: "",
  videoUrl: "",
  thumbnailUrl: "",
  bulletinUrl: "",
  summary: "",
  isFeatured: false,
  sortOrder: 0,
  isActive: true,
};

const EMPTY_SERIES: SermonSeriesWriteInput = {
  name: "",
  sortOrder: 0,
  isActive: true,
};

type SubKey = "sermons" | "series";

export function SermonsEditor() {
  const [section, setSection] = useState<SubKey>("sermons");
  const [seriesList, setSeriesList] = useState<SermonSeriesItem[]>([]);

  useEffect(() => { void loadSeries(); }, []);

  async function loadSeries() {
    try { setSeriesList(await onchurchSermonSeries.listMine()); }
    catch { /* keep empty */ }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">SERMONS</div>
        <h2>말씀</h2>
        <p>설교 영상 · 시리즈 필터를 관리합니다. 시리즈를 먼저 만든 뒤 설교에서 선택할 수 있습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="chips">
          {(["sermons", "series"] as const).map((s) => (
            <div
              key={s}
              className={`chip ${section === s ? "active" : ""}`}
              onClick={() => setSection(s)}
            >
              <span>{s === "sermons" ? "설교" : "시리즈"}</span>
            </div>
          ))}
        </div>

        {section === "sermons" && <SermonItemsEditor seriesList={seriesList} />}
        {section === "series" && <SermonSeriesEditor onChanged={loadSeries} />}
      </div>
    </section>
  );
}

function SermonItemsEditor({ seriesList }: { seriesList: SermonSeriesItem[] }) {
  const [items, setItems] = useState<SermonItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<SermonWriteInput>(EMPTY_SERMON);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchSermon.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "설교 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() { setEditing(0); setDraft({ ...EMPTY_SERMON, sortOrder: items.length }); }
  function startEdit(it: SermonItem) {
    setEditing(it.id);
    setDraft({
      seriesId: it.seriesId,
      title: it.title,
      pastor: it.pastor ?? "",
      date: it.date ?? "",
      duration: it.duration ?? "",
      videoUrl: it.videoUrl ?? "",
      thumbnailUrl: it.thumbnailUrl ?? "",
      bulletinUrl: it.bulletinUrl ?? "",
      summary: it.summary ?? "",
      isFeatured: it.isFeatured,
      sortOrder: it.sortOrder,
      isActive: it.isActive,
    });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_SERMON); setErrMsg(""); }

  async function save() {
    if (!draft.title.trim()) { setErrMsg("제목은 필수입니다."); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: SermonWriteInput = {
        seriesId: draft.seriesId ?? null,
        title: draft.title.trim(),
        pastor: (draft.pastor ?? "").trim() || null,
        date: (draft.date ?? "").trim() || null,
        duration: (draft.duration ?? "").trim() || null,
        videoUrl: (draft.videoUrl ?? "").trim() || null,
        thumbnailUrl: (draft.thumbnailUrl ?? "").trim() || null,
        bulletinUrl: (draft.bulletinUrl ?? "").trim() || null,
        summary: draft.summary ?? null,
        isFeatured: !!draft.isFeatured,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchSermon.create(payload);
      else await onchurchSermon.update(editing, payload);
      cancel(); await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 설교를 삭제할까요?")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchSermon.remove(id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  function seriesName(id: number | null): string {
    if (id == null) return "미분류";
    return seriesList.find((s) => s.id === id)?.name ?? "(삭제된 시리즈)";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 설교 추가</button>
      </div>
      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row">
              <label>시리즈</label>
              <select
                value={draft.seriesId ?? ""}
                onChange={(e) => setDraft({ ...draft, seriesId: e.target.value === "" ? null : Number(e.target.value) })}
              >
                <option value="">— 미분류 —</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{!s.isActive ? " (비공개)" : ""}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>제목 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="산상수훈, 천국 백성의 길" required />
            </div>
            <div className="form-row">
              <label>설교자</label>
              <input value={draft.pastor ?? ""} onChange={(e) => setDraft({ ...draft, pastor: e.target.value })} placeholder="김주은 목사" />
            </div>
            <div className="form-row">
              <label>날짜</label>
              <input value={draft.date ?? ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} placeholder="2026.03.22" />
            </div>
            <div className="form-row">
              <label>정렬</label>
              <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })} />
            </div>
            <div className="form-row full">
              <label>영상 URL</label>
              <input value={draft.videoUrl ?? ""} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div className="form-row">
              <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                <input type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} />
                <span>대표 설교</span>
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>취소</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.title.trim()}>
              {status === "saving" ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
        {status !== "loading" && items.length === 0 && editing === null && (
          <p style={{ color: "var(--muted)" }}>등록된 설교가 없습니다.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span className="admin-sidebar-pill complete" style={{ fontSize: 10 }}>{seriesName(it.seriesId)}</span>
                <strong>{it.title}</strong>
                {it.isFeatured && <span className="admin-sidebar-pill complete" style={{ fontSize: 10 }}>대표</span>}
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>순서 {it.sortOrder}</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {it.pastor && <span>{it.pastor}</span>}
                {it.pastor && (it.date || it.duration) && <span> · </span>}
                {it.date && <span>{it.date}</span>}
                {it.date && it.duration && <span> · </span>}
                {it.duration && <span>{it.duration}</span>}
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

function SermonSeriesEditor({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<SermonSeriesItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<SermonSeriesWriteInput>(EMPTY_SERIES);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchSermonSeries.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "시리즈 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() { setEditing(0); setDraft({ ...EMPTY_SERIES, sortOrder: items.length }); }
  function startEdit(it: SermonSeriesItem) {
    setEditing(it.id);
    setDraft({ name: it.name, sortOrder: it.sortOrder, isActive: it.isActive });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_SERIES); setErrMsg(""); }

  async function save() {
    if (!draft.name.trim()) { setErrMsg("이름은 필수입니다."); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: SermonSeriesWriteInput = {
        name: draft.name.trim(),
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchSermonSeries.create(payload);
      else await onchurchSermonSeries.update(editing, payload);
      cancel(); await load(); onChanged();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 시리즈를 삭제할까요? 시리즈에 속한 설교는 '미분류'로 남습니다.")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchSermonSeries.remove(id); await load(); onChanged(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 시리즈 추가</button>
      </div>
      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row">
              <label>이름 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="마태복음 강해" required />
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
          <p style={{ color: "var(--muted)" }}>등록된 시리즈가 없습니다.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{it.name}</strong>
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>순서 {it.sortOrder}</span>
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
