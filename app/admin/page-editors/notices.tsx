"use client";

import { useEffect, useState } from "react";
import { ApiError, onchurchNotice, type Notice, type NoticeWriteInput } from "@/lib/api-client";

type Status = "idle" | "loading" | "saving" | "deleting";

const EMPTY_INPUT: NoticeWriteInput = {
  category: "",
  title: "",
  content: "",
  author: "",
  isPinned: false,
  isActive: true,
  publishedAt: "",
};

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromDateInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function NoticesEditor() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<NoticeWriteInput>(EMPTY_INPUT);

  useEffect(() => {
    void load();
  }, []);

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
    setDraft({ ...EMPTY_INPUT, publishedAt: toDateInput(new Date().toISOString()) });
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
      publishedAt: toDateInput(n.publishedAt),
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
        publishedAt: fromDateInput(draft.publishedAt ?? ""),
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
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">NOTICES</div>
        <h2>공지사항</h2>
        <p>홈페이지의 &quot;교회 소식&quot; 페이지에 노출되는 공지 목록입니다. 고정 공지는 항상 상단에 표시됩니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                <input
                  id="nt-cat"
                  type="text"
                  value={draft.category ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  placeholder="공지 / 행사 / 교육 ..."
                />
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
                <label htmlFor="nt-date">게시일</label>
                <input
                  id="nt-date"
                  type="date"
                  value={draft.publishedAt ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, publishedAt: e.target.value }))}
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
    </section>
  );
}
