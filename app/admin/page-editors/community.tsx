"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  onchurchCommunity,
  onchurchCommunityCategory,
  type CommunityManagePost,
  type CommunityCategoryItem,
  type CommunityCategoryWriteInput,
} from "@/lib/api-client";
import { DEFAULT_COMMUNITY_CATEGORIES } from "@/lib/community-defaults";

type Status = "idle" | "loading" | "saving" | "deleting";
type SubKey = "posts" | "categories";

export function CommunityEditor() {
  const [section, setSection] = useState<SubKey>("posts");

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">COMMUNITY</div>
        <h2>교제</h2>
        <p>성도들이 글·사진·동영상 링크를 올리는 게시판입니다. 부적절한 글은 숨기거나 삭제할 수 있습니다. 좌측 토글로 페이지 노출 여부를 제어할 수 있습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="chips">
          {(["posts", "categories"] as const).map((s) => (
            <div key={s} className={`chip ${section === s ? "active" : ""}`} onClick={() => setSection(s)}>
              <span>{s === "posts" ? "게시글 관리" : "카테고리"}</span>
            </div>
          ))}
        </div>

        {section === "posts" ? <PostsManager /> : <CategoriesManager />}
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function PostsManager() {
  const [posts, setPosts] = useState<CommunityManagePost[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setPosts(await onchurchCommunity.listManage()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "게시글 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  async function toggleHidden(p: CommunityManagePost) {
    setStatus("saving"); setErrMsg("");
    try { await onchurchCommunity.setHidden(p.id, !p.isHidden); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "변경에 실패했습니다."); setStatus("idle"); }
  }

  async function remove(p: CommunityManagePost) {
    if (!confirm("이 게시글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchCommunity.removeManage(p.id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
      {status !== "loading" && posts.length === 0 && (
        <p style={{ color: "var(--muted)" }}>등록된 게시글이 없습니다.</p>
      )}
      {posts.map((p) => (
        <div key={p.id} className={`admin-banner-card ${p.isHidden ? "inactive" : ""}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {p.category && <span className="notice-cat">{p.category}</span>}
              <strong style={{ fontSize: 14 }}>{p.title}</strong>
              {p.isHidden && <span className="admin-sidebar-pill incomplete" style={{ fontSize: 10 }}>숨김</span>}
              {p.reportCount > 0 && <span className="admin-sidebar-pill incomplete" style={{ fontSize: 10 }}>신고 {p.reportCount}</span>}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
              {p.authorName} · {formatDate(p.createdAt)}
              {p.photoUrls.length > 0 ? ` · 사진 ${p.photoUrls.length}` : ""}
              {p.videoUrl ? " · 영상" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => toggleHidden(p)} disabled={status === "saving"}>
              {p.isHidden ? "노출" : "숨김"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => remove(p)} disabled={status === "deleting"}>삭제</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const EMPTY_CATEGORY: CommunityCategoryWriteInput = { name: "", sortOrder: 0, isActive: true };

function CategoriesManager() {
  const [items, setItems] = useState<CommunityCategoryItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<CommunityCategoryWriteInput>(EMPTY_CATEGORY);

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchCommunityCategory.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "카테고리를 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  function startNew() { setEditing(0); setDraft({ ...EMPTY_CATEGORY, sortOrder: items.length }); }
  function startEdit(c: CommunityCategoryItem) { setEditing(c.id); setDraft({ name: c.name, sortOrder: c.sortOrder, isActive: c.isActive }); }
  function cancel() { setEditing(null); setDraft(EMPTY_CATEGORY); setErrMsg(""); }

  async function save() {
    if (!draft.name.trim()) { setErrMsg("카테고리 이름을 입력해주세요."); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const payload = { name: draft.name.trim(), sortOrder: Number(draft.sortOrder) || 0, isActive: !!draft.isActive };
      if (editing === 0 || editing === null) await onchurchCommunityCategory.create(payload);
      else await onchurchCommunityCategory.update(editing, payload);
      cancel(); await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다."); setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 카테고리를 삭제할까요?")) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchCommunityCategory.remove(id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); setStatus("idle"); }
  }

  async function addDefaults() {
    setStatus("saving"); setErrMsg("");
    try {
      let order = items.length;
      for (const name of DEFAULT_COMMUNITY_CATEGORIES) {
        await onchurchCommunityCategory.create({ name, sortOrder: order++, isActive: true });
      }
      await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "기본 카테고리 추가에 실패했습니다."); setStatus("idle"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {items.length === 0 && (
          <button type="button" className="btn btn-secondary" onClick={addDefaults} disabled={editing !== null || status === "saving"}>
            기본 카테고리 추가
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>+ 카테고리 추가</button>
      </div>

      {editing !== null && (
        <div className="admin-banner-card editing">
          <div className="form-grid">
            <div className="form-row">
              <label>이름 <span className="required-mark" aria-hidden="true">*</span></label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="간증" required />
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
          <p style={{ color: "var(--muted)" }}>등록된 카테고리가 없습니다. 카테고리를 추가하면 성도가 글 작성 시 선택할 수 있습니다.</p>
        )}
        {items.map((c) => (
          <div key={c.id} className={`admin-banner-card ${c.isActive ? "" : "inactive"}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 14 }}>{c.name}</strong>
              {!c.isActive && <span className="admin-sidebar-pill incomplete" style={{ fontSize: 10 }}>비활성</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => startEdit(c)} disabled={editing !== null}>수정</button>
              <button type="button" className="btn btn-ghost" onClick={() => remove(c.id)} disabled={status === "deleting"}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
