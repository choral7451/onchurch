"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  onchurchNotice,
  onchurchNoticeCategory,
  type Notice,
  type NoticeWriteInput,
  type NoticeCategoryItem,
  type NoticeCategoryWriteInput,
} from "@/lib/api-client";
import { SortPositionSelect } from "@/components/admin/sort-position-select";
import { applyReorder } from "@/lib/admin-reorder";

type Status = "idle" | "loading" | "saving" | "deleting";

const EMPTY_INPUT: NoticeWriteInput = {
  category: "",
  title: "",
  content: "",
  author: "",
  isPinned: false,
  isActive: true,
  publishedAt: null,
};

const EMPTY_CATEGORY: NoticeCategoryWriteInput = {
  name: "",
  sortOrder: 0,
  isActive: true,
};

type SubKey = "notices" | "categories";

export function NoticesEditor() {
  const [section, setSection] = useState<SubKey>("notices");
  const [categories, setCategories] = useState<NoticeCategoryItem[]>([]);

  useEffect(() => { void loadCategories(); }, []);

  async function loadCategories() {
    try { setCategories(await onchurchNoticeCategory.listMine()); }
    catch { /* keep empty */ }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">NOTICES</div>
        <h2>공지사항</h2>
        <p>&quot;교회 소식&quot; 페이지에 노출되는 공지를 관리합니다. 카테고리를 먼저 만든 뒤 공지에서 선택할 수 있습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="chips">
          {(["notices", "categories"] as const).map((s) => (
            <div
              key={s}
              className={`chip ${section === s ? "active" : ""}`}
              onClick={() => setSection(s)}
            >
              <span>{s === "notices" ? "공지" : "카테고리"}</span>
            </div>
          ))}
        </div>

        {section === "notices" && <NoticeItemsEditor categories={categories} />}
        {section === "categories" && <NoticeCategoriesEditor onChanged={loadCategories} />}
      </div>
    </section>
  );
}

function NoticeItemsEditor({ categories }: { categories: NoticeCategoryItem[] }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<NoticeWriteInput>(EMPTY_INPUT);

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await onchurchNotice.listMine();
      setNotices(res.notices);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "공지 목록을 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  function startNew() {
    setEditingId(0);
    setDraft({ ...EMPTY_INPUT });
  }

  function startEdit(n: Notice) {
    setEditingId(n.id);
    setDraft({
      category: n.category ?? "",
      title: n.title,
      content: n.content ?? "",
      author: n.author ?? "",
      isPinned: n.isPinned,
      isActive: n.isActive,
      publishedAt: n.publishedAt,
    });
  }

  function cancel() {
    setEditingId(null);
    setDraft(EMPTY_INPUT);
    setErrMsg("");
  }

  async function save() {
    if (!draft.title.trim()) {
      setErrMsg("제목은 필수입니다.");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    try {
      const payload: NoticeWriteInput = {
        category: draft.category?.trim() || null,
        title: draft.title.trim(),
        content: draft.content?.trim() || null,
        author: draft.author?.trim() || null,
        isPinned: !!draft.isPinned,
        isActive: !!draft.isActive,
        publishedAt: draft.publishedAt ?? null,
      };
      if (editingId === 0 || editingId === null) {
        await onchurchNotice.create(payload);
      } else {
        await onchurchNotice.update(editingId, payload);
      }
      cancel();
      await load();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  async function remove(id: number) {
    if (!confirm("이 공지를 삭제할까요?")) return;
    setStatus("deleting");
    setErrMsg("");
    try {
      await onchurchNotice.remove(id);
      await load();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editingId !== null}>
          + 새 공지 작성
        </button>
      </div>

      {editingId !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row full">
              <label htmlFor="nt-title">제목 <span className="required-mark" aria-hidden="true">*</span></label>
              <input
                id="nt-title"
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="[공지] 새가족반 등록 안내"
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="nt-cat">카테고리</label>
              <select
                id="nt-cat"
                value={draft.category ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value || null }))}
              >
                <option value="">— 미분류 —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}{!c.isActive ? " (비공개)" : ""}</option>
                ))}
              </select>
              {categories.length === 0 && (
                <span className="form-hint" style={{ fontSize: 12, marginTop: 4 }}>
                  &quot;카테고리&quot; 탭에서 먼저 카테고리를 추가해주세요.
                </span>
              )}
            </div>
            <div className="form-row">
              <label htmlFor="nt-author">작성자</label>
              <input
                id="nt-author"
                type="text"
                value={draft.author ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
                placeholder="교무팀"
              />
            </div>
            <div className="form-row">
              <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                <input
                  type="checkbox"
                  checked={draft.isPinned}
                  onChange={(e) => setDraft((d) => ({ ...d, isPinned: e.target.checked }))}
                />
                <span>상단 고정</span>
              </label>
            </div>
            <div className="form-row">
              <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                <span>공개</span>
              </label>
            </div>
            <div className="form-row full">
              <label htmlFor="nt-content">본문</label>
              <textarea
                id="nt-content"
                rows={6}
                value={draft.content ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                placeholder="공지 본문을 입력해주세요"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>
              취소
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.title.trim()}>
              {status === "saving" ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
        {status !== "loading" && notices.length === 0 && editingId === null && (
          <p style={{ color: "var(--muted)" }}>등록된 공지가 없습니다. 새 공지를 작성해보세요.</p>
        )}
        {notices.map((n) => (
          <div key={n.id} className={`admin-banner-card ${n.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {n.isPinned && (
                  <span className="admin-sidebar-pill incomplete" style={{ fontSize: 10 }}>고정</span>
                )}
                {n.category && (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>[{n.category}]</span>
                )}
                <strong>{n.title}</strong>
                <span className={`admin-sidebar-pill ${n.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {n.isActive ? "공개" : "비공개"}
                </span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {n.author ?? "—"} · {(n.publishedAt ?? n.createdAt).slice(0, 10)}
              </div>
              {n.content && (
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4, whiteSpace: "pre-wrap" }}>
                  {n.content.length > 120 ? n.content.slice(0, 120) + "..." : n.content}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
              <button type="button" className="btn btn-ghost" onClick={() => startEdit(n)} disabled={editingId !== null}>
                편집
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => remove(n.id)} disabled={status === "deleting"}>
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoticeCategoriesEditor({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<NoticeCategoryItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<NoticeCategoryWriteInput>(EMPTY_CATEGORY);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchNoticeCategory.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "카테고리 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() { setEditing(0); setDraft({ ...EMPTY_CATEGORY }); }
  function startEdit(it: NoticeCategoryItem) {
    setEditing(it.id);
    setDraft({ name: it.name, sortOrder: it.sortOrder, isActive: it.isActive });
  }
  function cancel() { setEditing(null); setDraft(EMPTY_CATEGORY); setErrMsg(""); }

  async function save() {
    if (!draft.name.trim()) { setErrMsg("이름은 필수입니다."); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const payload: NoticeCategoryWriteInput = {
        name: draft.name.trim(),
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchNoticeCategory.create(payload);
      else await onchurchNoticeCategory.update(editing, payload);
      cancel(); await load(); onChanged();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 카테고리를 삭제할까요? 기존 공지의 카테고리 표시는 유지됩니다.")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchNoticeCategory.remove(id); await load(); onChanged(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  async function move(fromIndex: number, toIndex: number) {
    setStatus("saving"); setErrMsg("");
    try {
      await applyReorder(items, fromIndex, toIndex, (it, next) =>
        onchurchNoticeCategory.update(it.id, {
          name: it.name,
          sortOrder: next,
          isActive: it.isActive,
        }),
      );
      await load(); onChanged();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "순서 변경에 실패했습니다."); }
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
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="행사" required />
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
        {items.map((it, idx) => (
          <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong>{it.name}</strong>
                <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.isActive ? "공개" : "비공개"}
                </span>
                <SortPositionSelect
                  index={idx}
                  total={items.length}
                  onMove={(next) => void move(idx, next)}
                  disabled={editing !== null || status === "saving"}
                />
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
