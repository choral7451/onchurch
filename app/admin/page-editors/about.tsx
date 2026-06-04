"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  onchurchPastor,
  onchurchVision,
  onchurchHistory,
  onchurchStaff,
  uploadImages,
  type Pastor,
  type PastorWriteInput,
  type VisionItem,
  type VisionWriteInput,
  type HistoryItem,
  type HistoryWriteInput,
  type StaffMember,
  type StaffWriteInput,
} from "@/lib/api-client";
import { DragHandle } from "@/components/admin/drag-handle";
import { useDragSort } from "@/lib/use-drag-sort";
import { applyReorder } from "@/lib/admin-reorder";

type SectionKey = "pastor" | "vision" | "history" | "staff";

type AboutVisibility = { vision: boolean; history: boolean; staff: boolean };
type AboutEditorProps = {
  visibility: AboutVisibility;
  onToggleVisibility: (key: keyof AboutVisibility, on: boolean) => void;
  onChanged?: () => void;
};

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

export function AboutEditor({ visibility, onToggleVisibility, onChanged }: AboutEditorProps) {
  const [section, setSection] = useState<SectionKey>("pastor");

  const subLabel: Record<SectionKey, string> = {
    pastor: "담임목사",
    vision: "비전",
    history: "연혁",
    staff: "섬김의 사람들",
  };

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">ABOUT</div>
        <h2>교회 소개 <span className="admin-sidebar-pill complete" style={{ fontSize: 10, marginLeft: 8, verticalAlign: "middle" }}>필수</span></h2>
        <p>담임목사 인사말은 필수입니다. 비전 · 연혁 · 섬김의 사람들은 공개 여부를 선택할 수 있습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="chips">
          {(["pastor", "vision", "history", "staff"] as const).map((s) => {
            const isPastor = s === "pastor";
            const isOn = isPastor ? true : visibility[s as keyof AboutVisibility];
            return (
              <div
                key={s}
                className={`chip ${section === s ? "active" : ""}`}
                onClick={() => setSection(s)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <span>{subLabel[s]}</span>
                {isPastor ? (
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

        {section === "pastor" && <PastorEditor onChanged={onChanged} />}
        {section === "vision" && (
          <VisionEditor visible={visibility.vision} onToggleVisible={(on) => onToggleVisibility("vision", on)} />
        )}
        {section === "history" && (
          <HistoryEditor visible={visibility.history} onToggleVisible={(on) => onToggleVisibility("history", on)} />
        )}
        {section === "staff" && (
          <StaffEditor visible={visibility.staff} onToggleVisible={(on) => onToggleVisibility("staff", on)} />
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

function PhotoUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrMsg("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setErrMsg("");
    setUploading(true);
    try {
      const [uploaded] = await uploadImages([file]);
      if (uploaded?.url) onChange(uploaded.url);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="form-row full">
      <label>{label}</label>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "var(--r-md)",
            border: "1px dashed var(--muted-2)",
            background: "var(--surface-2)",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ color: "var(--muted)", fontSize: 11 }}>미리보기</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "업로드 중..." : value ? "사진 변경" : "사진 업로드"}
          </button>
          {value && (
            <button type="button" className="btn btn-ghost" onClick={() => onChange(null)} disabled={uploading}>
              제거
            </button>
          )}
          <span className="form-hint" style={{ fontSize: 12 }}>JPG/PNG · 최대 32MB</span>
          {errMsg && <span style={{ color: "oklch(0.55 0.18 28)", fontSize: 12 }}>{errMsg}</span>}
        </div>
      </div>
    </div>
  );
}

function PastorEditor({ onChanged }: { onChanged?: () => void }) {
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
        longMessage: null,
        photoUrl: (draft.photoUrl ?? "").trim() || null,
      });
      setPastor(updated);
      setSavedMsg("저장되었습니다.");
      setTimeout(() => setSavedMsg(""), 2000);
      onChanged?.();
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
        <PhotoUploadField
          label="사진"
          value={draft.photoUrl ?? null}
          onChange={(url) => setDraft({ ...draft, photoUrl: url ?? "" })}
        />
        <div className="form-row full">
          <label>인사말</label>
          <textarea rows={8} value={draft.message ?? ""} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="성도들과 방문자에게 전하고 싶은 인사말을 적어주세요." />
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

function VisionEditor({ visible, onToggleVisible }: { visible: boolean; onToggleVisible: (on: boolean) => void }) {
  const [items, setItems] = useState<VisionItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<VisionWriteInput>(EMPTY_VISION);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const dragDisabled = editing !== null || status === "saving" || status === "deleting";
  const { getItemProps } = useDragSort(items.length, (f, t) => void move(f, t));

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

  async function move(fromIndex: number, toIndex: number) {
    setStatus("saving"); setErrMsg("");
    try {
      await applyReorder(items, fromIndex, toIndex, (it, next) =>
        onchurchVision.update(it.id, {
          ko: it.ko,
          en: it.en ?? null,
          description: it.description ?? null,
          sortOrder: next,
          isActive: it.isActive,
        }),
      );
      await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "순서 변경에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionVisibilityToggle label="비전" visible={visible} onToggle={onToggleVisible} />
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
        {items.map((it, idx) => (
          <div
            key={it.id}
            className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}
            {...(dragDisabled ? {} : getItemProps(idx))}
          >
            <DragHandle disabled={dragDisabled} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <strong>{it.ko}</strong>
                {it.en && <span style={{ color: "var(--muted)", fontSize: 12 }}>· {it.en}</span>}
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

function HistoryEditor({ visible, onToggleVisible }: { visible: boolean; onToggleVisible: (on: boolean) => void }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<HistoryWriteInput>(EMPTY_HISTORY);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const dragDisabled = editing !== null || status === "saving" || status === "deleting";
  const { getItemProps } = useDragSort(items.length, (f, t) => void move(f, t));

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

  async function move(fromIndex: number, toIndex: number) {
    setStatus("saving"); setErrMsg("");
    try {
      await applyReorder(items, fromIndex, toIndex, (it, next) =>
        onchurchHistory.update(it.id, {
          year: it.year,
          title: it.title,
          description: it.description ?? null,
          sortOrder: next,
          isActive: it.isActive,
        }),
      );
      await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "순서 변경에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionVisibilityToggle label="연혁" visible={visible} onToggle={onToggleVisible} />
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
        {items.map((it, idx) => (
          <div
            key={it.id}
            className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}
            {...(dragDisabled ? {} : getItemProps(idx))}
          >
            <DragHandle disabled={dragDisabled} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
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

function StaffEditor({ visible, onToggleVisible }: { visible: boolean; onToggleVisible: (on: boolean) => void }) {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<StaffWriteInput>(EMPTY_STAFF);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const dragDisabled = editing !== null || status === "saving" || status === "deleting";
  const { getItemProps } = useDragSort(items.length, (f, t) => void move(f, t));

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchStaff.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "섬김의 사람들 목록을 불러오지 못했습니다."); }
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
    if (!confirm("이 섬김의 사람들 항목을 삭제할까요?")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchStaff.remove(id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function move(fromIndex: number, toIndex: number) {
    setStatus("saving"); setErrMsg("");
    try {
      await applyReorder(items, fromIndex, toIndex, (it, next) =>
        onchurchStaff.update(it.id, {
          name: it.name,
          role: it.role ?? null,
          area: it.area ?? null,
          photoUrl: it.photoUrl ?? null,
          sortOrder: next,
          isActive: it.isActive,
        }),
      );
      await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "순서 변경에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionVisibilityToggle label="섬김의 사람들" visible={visible} onToggle={onToggleVisible} />
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 섬김의 사람들 추가</button>
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
              <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                <span>활성</span>
              </label>
            </div>
            <PhotoUploadField
              label="사진"
              value={draft.photoUrl ?? null}
              onChange={(url) => setDraft({ ...draft, photoUrl: url ?? "" })}
            />
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
          <p style={{ color: "var(--muted)" }}>등록된 섬김의 사람들이 없습니다.</p>
        )}
        {items.map((it, idx) => (
          <div
            key={it.id}
            className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}
            {...(dragDisabled ? {} : getItemProps(idx))}
          >
            <DragHandle disabled={dragDisabled} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
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
