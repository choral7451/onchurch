"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  onchurchGallery,
  onchurchGalleryCategory,
  uploadImages,
  type GalleryItemRow,
  type GalleryWriteInput,
  type GalleryCategoryItem,
  type GalleryCategoryWriteInput,
} from "@/lib/api-client";

type Status = "idle" | "loading" | "saving" | "deleting";

const GRADS = ["ph-grad-1", "ph-grad-2", "ph-grad-3", "ph-grad-4"] as const;

const EMPTY_GALLERY: GalleryWriteInput = {
  categoryId: null,
  title: "",
  date: "",
  photoUrl: "",
  grad: "ph-grad-1",
  sortOrder: 0,
  isActive: true,
};

const EMPTY_CATEGORY: GalleryCategoryWriteInput = {
  name: "",
  sortOrder: 0,
  isActive: true,
};

type SubKey = "photos" | "categories";

export function GalleryEditor() {
  const [section, setSection] = useState<SubKey>("photos");
  const [categories, setCategories] = useState<GalleryCategoryItem[]>([]);

  useEffect(() => { void loadCategories(); }, []);

  async function loadCategories() {
    try { setCategories(await onchurchGalleryCategory.listMine()); }
    catch { /* keep empty */ }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">GALLERY</div>
        <h2>갤러리</h2>
        <p>교회의 사진을 카테고리별로 모아 둡니다. 카테고리를 먼저 만든 뒤 사진에서 선택할 수 있습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="chips">
          {(["photos", "categories"] as const).map((s) => (
            <div
              key={s}
              className={`chip ${section === s ? "active" : ""}`}
              onClick={() => setSection(s)}
            >
              <span>{s === "photos" ? "사진" : "카테고리"}</span>
            </div>
          ))}
        </div>

        {section === "photos" && <GalleryItemsEditor categories={categories} />}
        {section === "categories" && <GalleryCategoriesEditor onChanged={loadCategories} />}
      </div>
    </section>
  );
}

function GalleryItemsEditor({ categories }: { categories: GalleryCategoryItem[] }) {
  const [items, setItems] = useState<GalleryItemRow[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<GalleryWriteInput>(EMPTY_GALLERY);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchGallery.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "갤러리 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() {
    setEditing(0);
    setDraft({ ...EMPTY_GALLERY, grad: GRADS[items.length % GRADS.length] });
  }
  function startEdit(it: GalleryItemRow) {
    setEditing(it.id);
    setDraft({
      categoryId: it.categoryId,
      title: it.title,
      date: it.date ?? "",
      photoUrl: it.photoUrl ?? "",
      grad: it.grad ?? "ph-grad-1",
      sortOrder: it.sortOrder,
      isActive: it.isActive,
    });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_GALLERY); setErrMsg(""); }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
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
      if (uploaded?.url) setDraft((d) => ({ ...d, photoUrl: uploaded.url }));
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function save() {
    if (!draft.title.trim()) { setErrMsg("제목은 필수입니다."); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: GalleryWriteInput = {
        categoryId: draft.categoryId ?? null,
        title: draft.title.trim(),
        date: (draft.date ?? "").trim() || null,
        photoUrl: (draft.photoUrl ?? "").trim() || null,
        grad: (draft.grad ?? "").trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchGallery.create(payload);
      else await onchurchGallery.update(editing, payload);
      cancel(); await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchGallery.remove(id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function onBulkPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      if (bulkInputRef.current) bulkInputRef.current.value = "";
      return;
    }
    setErrMsg("");
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: files.length });
    let failed = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const [uploaded] = await uploadImages([file]);
          if (!uploaded?.url) { failed++; continue; }
          const baseName = file.name.replace(/\.[^.]+$/, "") || "사진";
          await onchurchGallery.create({
            categoryId: bulkCategoryId,
            title: baseName,
            date: null,
            photoUrl: uploaded.url,
            grad: GRADS[i % GRADS.length],
            sortOrder: 0,
            isActive: true,
          });
        } catch {
          failed++;
        }
        setBulkProgress({ done: i + 1, total: files.length });
      }
      await load();
      if (failed > 0) setErrMsg(`${failed}개 파일 업로드에 실패했습니다.`);
    } finally {
      setBulkBusy(false);
      setBulkProgress(null);
      if (bulkInputRef.current) bulkInputRef.current.value = "";
    }
  }

  function categoryName(id: number | null): string {
    if (id == null) return "미분류";
    return categories.find((c) => c.id === id)?.name ?? "(삭제된 카테고리)";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <select
          value={bulkCategoryId ?? ""}
          onChange={(e) => setBulkCategoryId(e.target.value === "" ? null : Number(e.target.value))}
          disabled={bulkBusy || editing !== null}
          style={{ height: 34 }}
          aria-label="여러 장 업로드 카테고리"
        >
          <option value="">— 미분류로 업로드 —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{!c.isActive ? " (비공개)" : ""}</option>
          ))}
        </select>
        <input ref={bulkInputRef} type="file" accept="image/*" multiple onChange={onBulkPick} style={{ display: "none" }} />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => bulkInputRef.current?.click()}
          disabled={bulkBusy || editing !== null}
        >
          {bulkBusy && bulkProgress
            ? `업로드 중 ${bulkProgress.done}/${bulkProgress.total}`
            : "+ 여러 장 업로드"}
        </button>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null || bulkBusy}>+ 사진 추가</button>
      </div>
      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row full">
              <label>사진</label>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div
                  style={{
                    width: 120,
                    height: 90,
                    borderRadius: "var(--r-md)",
                    border: "1px dashed var(--muted-2)",
                    background: "var(--surface-2)",
                    overflow: "hidden",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                  className={!draft.photoUrl ? draft.grad ?? "" : ""}
                >
                  {draft.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>그라디언트</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={onPickPhoto} style={{ display: "none" }} />
                  <button type="button" className="btn btn-secondary" onClick={() => photoInputRef.current?.click()} disabled={uploading}>
                    {uploading ? "업로드 중..." : draft.photoUrl ? "사진 변경" : "사진 업로드"}
                  </button>
                  {draft.photoUrl && (
                    <button type="button" className="btn btn-ghost" onClick={() => setDraft({ ...draft, photoUrl: "" })}>
                      사진 제거 (그라디언트로)
                    </button>
                  )}
                  <span className="form-hint" style={{ fontSize: 12 }}>JPG/PNG · 최대 32MB</span>
                </div>
              </div>
            </div>
            <div className="form-row">
              <label>카테고리</label>
              <select
                value={draft.categoryId ?? ""}
                onChange={(e) => setDraft({ ...draft, categoryId: e.target.value === "" ? null : Number(e.target.value) })}
              >
                <option value="">— 미분류 —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{!c.isActive ? " (비공개)" : ""}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>제목 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="2026 신년 감사예배" required />
            </div>
            <div className="form-row">
              <label>날짜 표시</label>
              <input value={draft.date ?? ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} placeholder="JAN 01" />
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
          <p style={{ color: "var(--muted)" }}>등록된 사진이 없습니다.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div
              style={{ width: 80, height: 60, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--surface-2)" }}
              className={!it.photoUrl ? it.grad ?? "" : ""}
            >
              {it.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span className="admin-sidebar-pill complete" style={{ fontSize: 10 }}>{categoryName(it.categoryId)}</span>
                <strong>{it.title}</strong>
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
              </div>
              {it.date && <div style={{ color: "var(--muted)", fontSize: 13 }}>{it.date}</div>}
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

function GalleryCategoriesEditor({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<GalleryCategoryItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<GalleryCategoryWriteInput>(EMPTY_CATEGORY);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchGalleryCategory.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "카테고리 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() { setEditing(0); setDraft({ ...EMPTY_CATEGORY }); }
  function startEdit(it: GalleryCategoryItem) {
    setEditing(it.id);
    setDraft({ name: it.name, sortOrder: it.sortOrder, isActive: it.isActive });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_CATEGORY); setErrMsg(""); }

  async function save() {
    if (!draft.name.trim()) { setErrMsg("이름은 필수입니다."); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: GalleryCategoryWriteInput = {
        name: draft.name.trim(),
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchGalleryCategory.create(payload);
      else await onchurchGalleryCategory.update(editing, payload);
      cancel(); await load(); onChanged();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 카테고리를 삭제할까요? 카테고리에 속한 사진은 '미분류'로 남습니다.")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchGalleryCategory.remove(id); await load(); onChanged(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 카테고리 추가</button>
      </div>
      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row">
              <label>이름 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="예배" required />
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
          <p style={{ color: "var(--muted)" }}>등록된 카테고리가 없습니다.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{it.name}</strong>
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
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
