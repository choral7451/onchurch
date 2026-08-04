"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { type Lang, pick } from "@/lib/i18n";
import {
  ApiError,
  getCurrentUserId,
  isLoggedInForChurch,
  onchurchCommunity,
  uploadImages,
  type CommunityPost,
} from "@/lib/api-client";
import { toEmbedUrl, toVideoThumbnailUrl } from "@/lib/video-embed";

type Props = {
  slug: string;
  initialPosts: CommunityPost[];
  totalCount: number;
  pageSize: number;
  categories: string[];
  loginHref: string;
  lang?: Lang;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

type PhotoRatio = "1:1" | "4:5";

type Draft = {
  id: number | null;
  category: string;
  title: string;
  content: string;
  photoUrls: string[];
  photoRatio: PhotoRatio;
  videoUrl: string;
};

const EMPTY_DRAFT: Draft = { id: null, category: "", title: "", content: "", photoUrls: [], photoRatio: "1:1", videoUrl: "" };

// 인스타처럼 게시글별 이미지 비율(1:1 / 4:5)을 CSS aspect-ratio 값으로 변환.
function ratioCss(r: PhotoRatio | undefined): string {
  return r === "4:5" ? "4 / 5" : "1 / 1";
}

// 피드 카드 — 글쓰기 폼의 실시간 미리보기에서도 같은 모습으로 재사용한다.
function PostCard({ p, videoBadge, onClick }: { p: CommunityPost; videoBadge: string; onClick?: () => void }) {
  const hasVideo = !!p.videoUrl;
  const videoThumb = hasVideo ? toVideoThumbnailUrl(p.videoUrl) : null;
  const thumb = p.photoUrls[0] ?? videoThumb;
  const hasMedia = !!thumb || hasVideo;
  const manyPhotos = p.photoUrls.length > 1;
  return (
    <button
      type="button"
      className={`card ${onClick ? "card-hover" : ""}`}
      onClick={onClick}
      tabIndex={onClick ? undefined : -1}
      style={{ textAlign: "left", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", cursor: onClick ? "pointer" : "default", width: "100%" }}
    >
      {/* 인스타 스타일: 게시글에서 고른 비율(1:1 / 4:5)대로 이미지가 카드를 지배하고 텍스트는 아래로 */}
      {hasMedia && (
        <div style={{ position: "relative", aspectRatio: ratioCss(p.photoRatio), background: "var(--surface-2, #f1f1f1)" }}>
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            // 영상만 있고 썸네일을 못 만든 경우: 그라데이션 + 플레이 표시
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "linear-gradient(135deg, var(--primary), var(--primary-deep, #1f2937))", color: "rgba(255,255,255,0.92)" }}>
              <span style={{ fontSize: 34, lineHeight: 1 }}>▶</span>
            </div>
          )}
          {hasVideo && thumb && (
            // 썸네일 위 중앙 플레이 버튼
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
              <span style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,0,0,0.55)", color: "#fff", display: "grid", placeItems: "center", fontSize: 20, paddingLeft: 4 }}>▶</span>
            </div>
          )}
          {hasVideo && (
            <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.65)", color: "#fff", borderRadius: 999, padding: "3px 9px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
              ▶ {videoBadge}
            </span>
          )}
          {manyPhotos && !hasVideo && (
            // 사진 여러 장: 인스타의 겹친 사각형 배지
            <span aria-hidden="true" style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}>
              <span style={{ position: "absolute", top: 0, right: 0, width: 13, height: 13, borderRadius: 3, background: "rgba(255,255,255,0.55)" }} />
              <span style={{ position: "absolute", bottom: 0, left: 0, width: 13, height: 13, borderRadius: 3, background: "#fff" }} />
            </span>
          )}
        </div>
      )}
      {/* 이미지 아래 텍스트: 작성자 · 제목 · 본문 캡션 */}
      <div style={{ padding: hasMedia ? "12px 14px 14px" : "16px 18px", display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: hasMedia ? undefined : 168 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5 }}>
          <span style={{ fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.authorName}</span>
          <span style={{ color: "var(--muted)", flexShrink: 0 }}>{formatDate(p.createdAt)}</span>
        </div>
        {p.category && <span className="notice-cat" style={{ alignSelf: "flex-start" }}>{p.category}</span>}
        <strong style={{ fontSize: 14.5, lineHeight: 1.4, color: "var(--ink)" }}>{p.title}</strong>
        {p.content && (
          <p
            style={{
              margin: 0,
              color: "var(--muted)",
              fontSize: 13.5,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: hasMedia ? 2 : 4,
              WebkitBoxOrient: "vertical",
            }}
          >
            {p.content}
          </p>
        )}
      </div>
    </button>
  );
}

export function CommunityBoard({ slug, initialPosts, totalCount, pageSize, categories, loginHref, lang = "ko" }: Props) {
  const t = pick(lang, {
    ko: {
      all: "전체",
      write: "+ 글쓰기",
      loginWrite: "로그인하고 글쓰기",
      selectCategory: "카테고리 선택",
      category: "카테고리",
      none: "선택 안 함",
      videoLink: "동영상 링크 (선택)",
      videoLinkPh: "YouTube 링크",
      title: "제목",
      titlePh: "제목을 입력해주세요",
      content: "내용",
      contentPh: "나누고 싶은 이야기를 자유롭게 적어주세요.",
      photos: "사진",
      photoViewLabel: "사진 크게 보기",
      photoViewHint: "선택한 비율로 이렇게 등록돼요",
      photoRatio: "이미지 비율",
      ratioSquare: "1:1 정사각형",
      ratioPortrait: "4:5 세로",
      removePhoto: "사진 제거",
      uploading: "업로드 중...",
      addPhoto: "사진 추가",
      cancel: "취소",
      saving: "저장 중...",
      updateDone: "수정 완료",
      postSubmit: "등록",
      empty: "아직 등록된 글이 없습니다.",
      emptyLoggedIn: "첫 글을 남겨보세요!",
      emptyLoggedOut: "로그인 후 첫 글을 남겨보세요!",
      videoBadge: "영상",
      close: "닫기",
      videoTitle: "동영상",
      watchVideo: "동영상 보기",
      noContent: "내용이 없습니다.",
      loadingMore: "불러오는 중...",
      report: "신고",
      edit: "수정",
      del: "삭제",
      confirmDelete: "이 게시글을 삭제할까요?",
      confirmReport: "이 게시글을 신고할까요? 관리자가 검토합니다.",
      reportDone: "신고가 접수되었습니다.",
      photoUploadFail: "사진 업로드에 실패했습니다.",
      titleRequired: "제목을 입력해주세요.",
      saveFail: "저장에 실패했습니다.",
      deleteFail: "삭제에 실패했습니다.",
      reportFail: "신고에 실패했습니다.",
    },
    en: {
      all: "All",
      write: "+ Write",
      loginWrite: "Log in to write",
      selectCategory: "Select category",
      category: "Category",
      none: "None",
      videoLink: "Video link (optional)",
      videoLinkPh: "YouTube link",
      title: "Title",
      titlePh: "Enter a title",
      content: "Message",
      contentPh: "Feel free to share what's on your mind.",
      photos: "Photos",
      photoViewLabel: "View photo",
      photoViewHint: "It will be posted in the selected ratio",
      photoRatio: "Image ratio",
      ratioSquare: "Square 1:1",
      ratioPortrait: "Portrait 4:5",
      removePhoto: "Remove photo",
      uploading: "Uploading...",
      addPhoto: "Add photo",
      cancel: "Cancel",
      saving: "Saving...",
      updateDone: "Update",
      postSubmit: "Post",
      empty: "No posts yet.",
      emptyLoggedIn: "Be the first to write a post!",
      emptyLoggedOut: "Log in and be the first to write a post!",
      videoBadge: "Video",
      close: "Close",
      videoTitle: "Video",
      watchVideo: "Watch video",
      noContent: "No content.",
      loadingMore: "Loading...",
      report: "Report",
      edit: "Edit",
      del: "Delete",
      confirmDelete: "Delete this post?",
      confirmReport: "Report this post? An administrator will review it.",
      reportDone: "Your report has been submitted.",
      photoUploadFail: "Failed to upload photos.",
      titleRequired: "Please enter a title.",
      saveFail: "Failed to save.",
      deleteFail: "Failed to delete.",
      reportFail: "Failed to submit the report.",
    },
  });
  // "전체"는 API 필터 값(전체 조회 sentinel)이라 값은 유지하고 표시 라벨만 번역한다.
  const catLabel = (c: string) => (c === "전체" ? t.all : c);
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [total, setTotal] = useState<number>(totalCount);
  const [page, setPage] = useState(1);
  const [cat, setCat] = useState<string>("전체");
  const [loading, setLoading] = useState(false);
  // 카테고리 전환 중 표시 — 클릭 즉시 스켈레톤으로 바꿔 '바로 넘어간 것처럼' 보이게 한다.
  const [switching, setSwitching] = useState(false);
  // 빠른 연속 클릭 시 마지막 요청 응답만 반영하는 가드.
  const reqIdRef = useRef(0);
  const [active, setActive] = useState<CommunityPost | null>(null);

  const [loggedIn, setLoggedIn] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);

  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formErr, setFormErr] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  // 업로드한 사진을 본사이즈(선택한 비율로 잘린 모습)로 보여주는 모달 — draft.photoUrls 의 인덱스
  const [photoView, setPhotoView] = useState<number | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedInForChurch(slug));
    setMyId(getCurrentUserId());
  }, [slug]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const allCats = useMemo(() => ["전체", ...categories], [categories]);

  const hasMore = posts.length < total;

  // 현재 카테고리 기준 1페이지부터 다시 조회 (교체). 작성/수정/삭제 후에도 사용.
  const reload = useCallback(
    async (category: string) => {
      const myId = ++reqIdRef.current;
      setSwitching(true);
      setLoading(true);
      try {
        const res = await onchurchCommunity.listPublic(slug, { category, page: 1, size: pageSize });
        if (myId !== reqIdRef.current) return; // 더 최신 클릭이 있으면 버린다.
        setPosts(res.posts ?? []);
        setTotal(res.totalCount ?? 0);
        setPage(1);
      } catch {
        /* keep current */
      } finally {
        if (myId === reqIdRef.current) { setLoading(false); setSwitching(false); }
      }
    },
    [slug, pageSize],
  );

  // 카테고리 칩 클릭 → 즉시 칩 활성화 + 스켈레톤 전환, 데이터는 뒤이어 갱신.
  function selectCat(c: string) {
    if (c === cat) return;
    setCat(c);
    void reload(c);
  }

  // 무한스크롤 → 다음 페이지 append.
  const loadMore = useCallback(async () => {
    if (loading || switching || !hasMore) return;
    const myId = reqIdRef.current;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await onchurchCommunity.listPublic(slug, { category: cat, page: nextPage, size: pageSize });
      if (myId !== reqIdRef.current) return; // 그 사이 카테고리가 바뀌었으면 버린다.
      setPosts((prev) => [...prev, ...(res.posts ?? [])]);
      setTotal(res.totalCount ?? total);
      setPage(nextPage);
    } catch {
      /* 실패 시 다음 교차 시점에 재시도됨 */
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  }, [loading, switching, hasMore, page, cat, slug, pageSize, total]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  async function refresh() {
    await reload(cat);
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
      photoRatio: p.photoRatio === "4:5" ? "4:5" : "1:1",
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
      // 등록 직후 모달로 본사이즈 확인 — 어떤 비율로 잘려 올라가는지 바로 보여준다.
      if (uploaded.length > 0) setPhotoView(draft.photoUrls.length);
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : t.photoUploadFail);
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
    if (!draft.title.trim()) { setFormErr(t.titleRequired); return; }
    setSaving(true);
    setFormErr("");
    try {
      const payload = {
        category: draft.category || null,
        title: draft.title.trim(),
        content: draft.content.trim() || null,
        photoUrls: draft.photoUrls,
        photoRatio: draft.photoRatio,
        videoUrl: draft.videoUrl.trim() || null,
      };
      if (draft.id) await onchurchCommunity.update(draft.id, payload);
      else await onchurchCommunity.create(payload);
      cancelWrite();
      await refresh();
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : t.saveFail);
    } finally {
      setSaving(false);
    }
  }

  async function removePost(p: CommunityPost) {
    if (!confirm(t.confirmDelete)) return;
    try {
      await onchurchCommunity.remove(p.id);
      setActive(null);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t.deleteFail);
    }
  }

  async function report(p: CommunityPost) {
    if (!confirm(t.confirmReport)) return;
    try {
      await onchurchCommunity.report(slug, p.id);
      alert(t.reportDone);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t.reportFail);
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

  const photoCount = draft.photoUrls.length;
  // 모달이 열린 채 사진이 지워져도 안전하게 마지막 인덱스로 보정.
  const viewIdx = photoView !== null && photoCount > 0 ? Math.min(photoView, photoCount - 1) : null;
  useEffect(() => {
    if (photoView === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhotoView(null);
      if (photoCount > 1 && e.key === "ArrowLeft") setPhotoView((v) => (v === null ? v : (v - 1 + photoCount) % photoCount));
      if (photoCount > 1 && e.key === "ArrowRight") setPhotoView((v) => (v === null ? v : (v + 1) % photoCount));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [photoView, photoCount]);

  return (
    <>
      {/* 툴바: 카테고리 필터 + 글쓰기 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "nowrap" }}>
        {isMobile ? (
          <select
            value={cat}
            onChange={(e) => selectCat(e.target.value)}
            aria-label={t.selectCategory}
            style={{ flex: 1, minWidth: 0, padding: "10px 12px", fontSize: 14, border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)", fontFamily: "inherit" }}
          >
            {allCats.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select>
        ) : (
          <div className="chips" style={{ marginBottom: 0 }}>
            {allCats.map((c) => (
              <div key={c} className={`chip ${cat === c ? "active" : ""}`} onClick={() => selectCat(c)}>
                {catLabel(c)}
              </div>
            ))}
          </div>
        )}
        {loggedIn ? (
          <button type="button" className="btn btn-primary" onClick={startNew} disabled={writing}>
            {t.write}
          </button>
        ) : (
          <Link href={loginHref} className="btn btn-primary">
            {t.loginWrite}
          </Link>
        )}
      </div>

      {/* 작성/수정 폼 */}
      {writing && (
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          {formErr && <div className="phone-msg phone-msg-error" style={{ marginBottom: 16 }}>{formErr}</div>}
          <div className="form-grid">
            <div className="form-row">
              <label>{t.category}</label>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                <option value="">{t.none}</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>{t.videoLink}</label>
              <input
                type="url"
                value={draft.videoUrl}
                onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
                placeholder={t.videoLinkPh}
              />
            </div>
            <div className="form-row full">
              <label>{t.title} <span className="req">*</span></label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder={t.titlePh}
                maxLength={300}
                required
              />
            </div>
            <div className="form-row full">
              <label>{t.content}</label>
              <textarea
                rows={6}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder={t.contentPh}
              />
            </div>
            <div className="form-row full">
              <label>{t.photos}</label>
              <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={onPickPhotos} style={{ display: "none" }} />
              {/* 인스타처럼 이미지 비율 선택 (1:1 / 4:5) — 미리보기도 선택한 비율로 잘려 보인다 */}
              <div role="radiogroup" aria-label={t.photoRatio} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {([
                  { value: "1:1" as const, label: t.ratioSquare },
                  { value: "4:5" as const, label: t.ratioPortrait },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={draft.photoRatio === opt.value}
                    onClick={() => setDraft((d) => ({ ...d, photoRatio: opt.value }))}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "7px 13px",
                      borderRadius: 999,
                      fontSize: 13,
                      cursor: "pointer",
                      border: draft.photoRatio === opt.value ? "1.5px solid var(--primary)" : "1px solid var(--line)",
                      background: draft.photoRatio === opt.value ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--surface)",
                      color: draft.photoRatio === opt.value ? "var(--primary)" : "var(--muted)",
                      fontWeight: draft.photoRatio === opt.value ? 600 : 400,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: opt.value === "4:5" ? 11 : 13,
                        height: opt.value === "4:5" ? 14 : 13,
                        borderRadius: 3,
                        border: "1.5px solid currentColor",
                        display: "inline-block",
                      }}
                    />
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {draft.photoUrls.map((url, i) => (
                  <div key={url} style={{ position: "relative", width: 84, aspectRatio: ratioCss(draft.photoRatio), borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
                    {/* 썸네일 클릭 → 본사이즈 모달: 선택한 비율로 등록되는 모습을 크게 보여준다 */}
                    <button
                      type="button"
                      onClick={() => setPhotoView(i)}
                      aria-label={t.photoViewLabel}
                      style={{ display: "block", width: "100%", height: "100%", padding: 0, cursor: "zoom-in" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      aria-label={t.removePhoto}
                      style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, lineHeight: "20px" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* 파일 선택창을 바로 띄우지 않고 모달을 먼저 연다 — 업로드는 모달 안에서 */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPhotoView(0)}
                  disabled={uploading}
                >
                  <Icon.image style={{ width: 14, height: 14 }} />
                  {uploading ? t.uploading : t.addPhoto}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
            <button type="button" className="btn btn-ghost" onClick={cancelWrite} disabled={saving}>{t.cancel}</button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !draft.title.trim()}>
              {saving ? t.saving : draft.id ? t.updateDone : t.postSubmit}
            </button>
          </div>
        </div>
      )}

      {/* 게시글 그리드 */}
      {switching ? (
        <div className="community-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={`skel-${i}`} className="skel" aria-hidden="true" style={{ height: 340, borderRadius: "var(--r-lg)" }} />
          ))}
        </div>
      ) : posts.length === 0 && !loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
          {t.empty}<br className="mobile-only-br" /> {loggedIn ? t.emptyLoggedIn : t.emptyLoggedOut}
        </div>
      ) : (
        <div className="community-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
          {posts.map((p) => (
            <PostCard key={p.id} p={p} videoBadge={t.videoBadge} onClick={() => setActive(p)} />
          ))}
        </div>
      )}

      {/* 무한스크롤 감지 지점 */}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />}

      {loading && !switching && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 24, fontSize: 13 }}>
          {t.loadingMore}
        </div>
      )}

      {/* 사진 본사이즈 모달: 선택한 비율(1:1/4:5)로 등록되는 모습을 크게 보여주고,
          여러 장 넘겨보기(화살표/썸네일) · 비율 변경 · 사진 추가까지 여기서 한다 */}
      {photoView !== null && (
        <div className="notice-modal-backdrop" role="dialog" aria-modal="true" aria-label={t.photoViewLabel} onClick={() => setPhotoView(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(92vw, 420px)", maxHeight: "calc(100dvh - 40px)" }}>
            <button
              type="button"
              aria-label={t.close}
              onClick={() => setPhotoView(null)}
              style={{ position: "absolute", top: -40, right: 0, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 18, lineHeight: 1, display: "grid", placeItems: "center", cursor: "pointer" }}
            >
              ×
            </button>
            <div style={{ position: "relative" }}>
              {viewIdx !== null ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.photoUrls[viewIdx]}
                  alt=""
                  style={{ width: "100%", maxHeight: "calc(100dvh - 220px)", aspectRatio: ratioCss(draft.photoRatio), objectFit: "cover", borderRadius: 14, display: "block", background: "#000", boxShadow: "0 20px 60px -10px rgba(0,0,0,0.5)" }}
                />
              ) : (
                // 아직 사진이 없을 때: 선택한 비율 크기의 업로드 영역
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                  style={{ width: "100%", aspectRatio: ratioCss(draft.photoRatio), maxHeight: "calc(100dvh - 220px)", borderRadius: 14, border: "2px dashed rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}
                >
                  <span style={{ display: "grid", placeItems: "center", gap: 10 }}>
                    <span aria-hidden="true" style={{ fontSize: 40, lineHeight: 1, opacity: 0.9 }}>+</span>
                    <span style={{ fontSize: 14 }}>{uploading ? t.uploading : t.addPhoto}</span>
                  </span>
                </button>
              )}
              {viewIdx !== null && photoCount > 1 && (
                <>
                  <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.55)", color: "#fff", borderRadius: 999, padding: "3px 10px", fontSize: 12 }}>
                    {viewIdx + 1} / {photoCount}
                  </span>
                  <button
                    type="button"
                    aria-label="‹"
                    onClick={() => setPhotoView((viewIdx - 1 + photoCount) % photoCount)}
                    style={{ position: "absolute", top: "50%", left: 8, transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 20, lineHeight: 1, display: "grid", placeItems: "center", cursor: "pointer" }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="›"
                    onClick={() => setPhotoView((viewIdx + 1) % photoCount)}
                    style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 20, lineHeight: 1, display: "grid", placeItems: "center", cursor: "pointer" }}
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            {/* 썸네일 스트립: 눌러서 다른 사진 보기 + 마지막 + 타일로 사진 추가 */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {draft.photoUrls.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhotoView(i)}
                  aria-label={`${i + 1}`}
                  style={{ width: 44, aspectRatio: ratioCss(draft.photoRatio), borderRadius: 6, overflow: "hidden", padding: 0, cursor: "pointer", border: i === viewIdx ? "2px solid #fff" : "2px solid transparent", opacity: i === viewIdx ? 1 : 0.55 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploading}
                aria-label={t.addPhoto}
                style={{ width: 44, aspectRatio: ratioCss(draft.photoRatio), borderRadius: 6, border: "1.5px dashed rgba(255,255,255,0.6)", background: "transparent", color: "#fff", fontSize: 18, display: "grid", placeItems: "center", cursor: "pointer", opacity: uploading ? 0.5 : 1 }}
              >
                {uploading ? "…" : "+"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {([
                { value: "1:1" as const, label: t.ratioSquare },
                { value: "4:5" as const, label: t.ratioPortrait },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={draft.photoRatio === opt.value}
                  onClick={() => setDraft((d) => ({ ...d, photoRatio: opt.value }))}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.4)",
                    background: draft.photoRatio === opt.value ? "#fff" : "transparent",
                    color: draft.photoRatio === opt.value ? "#111" : "#fff",
                    fontWeight: draft.photoRatio === opt.value ? 600 : 400,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p style={{ margin: "10px 0 0", textAlign: "center", color: "rgba(255,255,255,0.8)", fontSize: 12.5 }}>{t.photoViewHint}</p>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {active && (
        <div className="notice-modal-backdrop" role="dialog" aria-modal="true" aria-label={active.title} onClick={() => setActive(null)}>
          <div className="notice-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="notice-modal-close" aria-label={t.close} onClick={() => setActive(null)}>×</button>
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
                        title={t.videoTitle}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                      />
                    </div>
                  ) : (
                    <a href={active.videoUrl} target="_blank" rel="noreferrer noopener" className="btn btn-secondary">
                      ▶ {t.watchVideo}
                    </a>
                  )}
                </div>
              )}

              {active.photoUrls.length > 0 && (
                // 인스타 상세처럼 선택한 비율(1:1 / 4:5)로 큼직하게 세로 나열
                <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "16px 0" }}>
                  {active.photoUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" style={{ width: "100%", aspectRatio: ratioCss(active.photoRatio), objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
                  ))}
                </div>
              )}

              {active.content ? (
                <div className="notice-modal-content" style={{ whiteSpace: "pre-wrap" }}>{active.content}</div>
              ) : (
                <div className="notice-modal-content empty">{t.noContent}</div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <button type="button" className="btn btn-ghost" onClick={() => report(active)}>{t.report}</button>
                {myId != null && myId === active.authorId && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => startEdit(active)}>{t.edit}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => removePost(active)}>{t.del}</button>
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
