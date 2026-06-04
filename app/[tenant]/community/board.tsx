"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import {
  ApiError,
  getCurrentUserId,
  isLoggedIn,
  onchurchCommunity,
  uploadImages,
  type CommunityPost,
} from "@/lib/api-client";
import { toEmbedUrl } from "@/lib/video-embed";

type Props = {
  slug: string;
  initialPosts: CommunityPost[];
  categories: string[];
  loginHref: string;
};

const PAGE_SIZE = 12;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

type Draft = {
  id: number | null;
  category: string;
  title: string;
  content: string;
  photoUrls: string[];
  videoUrl: string;
};

const EMPTY_DRAFT: Draft = { id: null, category: "", title: "", content: "", photoUrls: [], videoUrl: "" };

export function CommunityBoard({ slug, initialPosts, categories, loginHref }: Props) {
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [cat, setCat] = useState<string>("전체");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<CommunityPost | null>(null);

  const [loggedIn, setLoggedIn] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);

  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formErr, setFormErr] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setMyId(getCurrentUserId());
  }, []);

  const allCats = useMemo(() => ["전체", ...categories], [categories]);

  const filtered = useMemo(
    () => (cat === "전체" ? posts : posts.filter((p) => (p.category ?? "") === cat)),
    [posts, cat],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function refresh() {
    try {
      const res = await onchurchCommunity.listPublic(slug, { size: 100 });
      setPosts(res.posts ?? []);
    } catch {
      /* keep current */
    }
  }

  // ── 작성/수정 ────────────────────────────────────────
  function startNew() {
    setDraft({ ...EMPTY_DRAFT, category: categories[0] ?? "" });
    setFormErr("");
    setWriting(true);
  }

  function startEdit(p: CommunityPost) {
    setDraft({
      id: p.id,
      category: p.category ?? "",
      title: p.title,
      content: p.content ?? "",
      photoUrls: [...p.photoUrls],
      videoUrl: p.videoUrl ?? "",
    });
    setActive(null);
    setFormErr("");
    setWriting(true);
  }

  function cancelWrite() {
    setWriting(false);
    setDraft(EMPTY_DRAFT);
    setFormErr("");
  }

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setFormErr("");
    try {
      const uploaded = await uploadImages(files);
      setDraft((d) => ({ ...d, photoUrls: [...d.photoUrls, ...uploaded.map((u) => u.url)] }));
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  function removePhoto(url: string) {
    setDraft((d) => ({ ...d, photoUrls: d.photoUrls.filter((u) => u !== url) }));
  }

  async function submit() {
    if (saving) return;
    if (!draft.title.trim()) { setFormErr("제목을 입력해주세요."); return; }
    setSaving(true);
    setFormErr("");
    try {
      const payload = {
        category: draft.category || null,
        title: draft.title.trim(),
        content: draft.content.trim() || null,
        photoUrls: draft.photoUrls,
        videoUrl: draft.videoUrl.trim() || null,
      };
      if (draft.id) await onchurchCommunity.update(draft.id, payload);
      else await onchurchCommunity.create(payload);
      cancelWrite();
      await refresh();
      setPage(1);
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function removePost(p: CommunityPost) {
    if (!confirm("이 게시글을 삭제할까요?")) return;
    try {
      await onchurchCommunity.remove(p.id);
      setActive(null);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    }
  }

  async function report(p: CommunityPost) {
    if (!confirm("이 게시글을 신고할까요? 관리자가 검토합니다.")) return;
    try {
      await onchurchCommunity.report(slug, p.id);
      alert("신고가 접수되었습니다.");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "신고에 실패했습니다.");
    }
  }

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <>
      {/* 툴바: 카테고리 필터 + 글쓰기 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <div className="chips" style={{ marginBottom: 0 }}>
          {allCats.map((c) => (
            <div key={c} className={`chip ${cat === c ? "active" : ""}`} onClick={() => { setCat(c); setPage(1); }}>
              {c}
            </div>
          ))}
        </div>
        {loggedIn ? (
          <button type="button" className="btn btn-primary" onClick={startNew} disabled={writing}>
            + 글쓰기
          </button>
        ) : (
          <Link href={loginHref} className="btn btn-primary">
            로그인하고 글쓰기
          </Link>
        )}
      </div>

      {/* 작성/수정 폼 */}
      {writing && (
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          {formErr && <div className="phone-msg phone-msg-error" style={{ marginBottom: 16 }}>{formErr}</div>}
          <div className="form-grid">
            <div className="form-row">
              <label>카테고리</label>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                <option value="">선택 안 함</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>동영상 링크 (선택)</label>
              <input
                type="url"
                value={draft.videoUrl}
                onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
                placeholder="YouTube / Vimeo 링크"
              />
            </div>
            <div className="form-row full">
              <label>제목 <span className="req">*</span></label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="제목을 입력해주세요"
                maxLength={300}
                required
              />
            </div>
            <div className="form-row full">
              <label>내용</label>
              <textarea
                rows={6}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="나누고 싶은 이야기를 자유롭게 적어주세요."
              />
            </div>
            <div className="form-row full">
              <label>사진</label>
              <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={onPickPhotos} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {draft.photoUrls.map((url) => (
                  <div key={url} style={{ position: "relative", width: 90, height: 68, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      aria-label="사진 제거"
                      style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, lineHeight: "20px" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Icon.image style={{ width: 14, height: 14 }} />
                  {uploading ? "업로드 중..." : "사진 추가"}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
            <button type="button" className="btn btn-ghost" onClick={cancelWrite} disabled={saving}>취소</button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !draft.title.trim()}>
              {saving ? "저장 중..." : draft.id ? "수정 완료" : "등록"}
            </button>
          </div>
        </div>
      )}

      {/* 게시글 그리드 */}
      {visible.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
          아직 등록된 글이 없습니다. {loggedIn ? "첫 글을 남겨보세요!" : "로그인 후 첫 글을 남겨보세요!"}
        </div>
      ) : (
        <div className="community-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
          {visible.map((p) => {
            const thumb = p.photoUrls[0] ?? null;
            const hasVideo = !!p.videoUrl;
            return (
              <button
                key={p.id}
                type="button"
                className="card card-hover"
                onClick={() => setActive(p)}
                style={{ textAlign: "left", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer" }}
              >
                <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--surface-2, #f1f1f1)" }}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--muted)" }}>
                      <Icon.image style={{ width: 28, height: 28 }} />
                    </div>
                  )}
                  {hasVideo && (
                    <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.65)", color: "#fff", borderRadius: 999, padding: "3px 9px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      ▶ 영상
                    </span>
                  )}
                </div>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  {p.category && <span className="notice-cat" style={{ alignSelf: "flex-start" }}>{p.category}</span>}
                  <strong style={{ fontSize: 15, lineHeight: 1.4, color: "var(--ink)" }}>{p.title}</strong>
                  <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 12 }}>
                    <span>{p.authorName}</span>
                    <span>{formatDate(p.createdAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 32, gap: 4 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              style={{
                width: 36, height: 36, border: "1px solid", borderRadius: 8,
                fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600,
                background: p === safePage ? "var(--primary)" : "var(--surface)",
                color: p === safePage ? "white" : "var(--ink)",
                borderColor: p === safePage ? "var(--primary)" : "var(--line)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {active && (
        <div className="notice-modal-backdrop" role="dialog" aria-modal="true" aria-label={active.title} onClick={() => setActive(null)}>
          <div className="notice-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="notice-modal-close" aria-label="닫기" onClick={() => setActive(null)}>×</button>
            <div className="notice-modal-body">
              <div className="notice-modal-head">
                {active.category && <span className="notice-modal-cat">{active.category}</span>}
              </div>
              <h3 className="notice-modal-title">{active.title}</h3>
              <div className="notice-modal-meta">
                <span>{active.authorName}</span>
                <span className="dot" />
                <span>{formatDate(active.createdAt)}</span>
              </div>

              {active.videoUrl && (
                <div style={{ margin: "16px 0" }}>
                  {toEmbedUrl(active.videoUrl) ? (
                    <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden" }}>
                      <iframe
                        src={toEmbedUrl(active.videoUrl)!}
                        title="동영상"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                      />
                    </div>
                  ) : (
                    <a href={active.videoUrl} target="_blank" rel="noreferrer noopener" className="btn btn-secondary">
                      ▶ 동영상 보기
                    </a>
                  )}
                </div>
              )}

              {active.photoUrls.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, margin: "16px 0" }}>
                  {active.photoUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} />
                  ))}
                </div>
              )}

              {active.content ? (
                <div className="notice-modal-content" style={{ whiteSpace: "pre-wrap" }}>{active.content}</div>
              ) : (
                <div className="notice-modal-content empty">내용이 없습니다.</div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <button type="button" className="btn btn-ghost" onClick={() => report(active)}>신고</button>
                {myId != null && myId === active.authorId && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => startEdit(active)}>수정</button>
                    <button type="button" className="btn btn-ghost" onClick={() => removePost(active)}>삭제</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
