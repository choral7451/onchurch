"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ApiError, onchurchBanner, uploadImages, uploadVideo, type Banner, type BannerWriteInput } from "@/lib/api-client";
import { DragHandle } from "@/components/admin/drag-handle";
import { useDragSort } from "@/lib/use-drag-sort";
import { applyReorder } from "@/lib/admin-reorder";

type Status = "idle" | "loading" | "saving" | "deleting";
type BannerType = "image" | "video";

type Draft = {
  type: BannerType;
  imageUrls: string[];
  videoUrl: string;
  linkUrl: string | null;
  sortOrder: number;
};

const EMPTY_DRAFT: Draft = {
  type: "image",
  imageUrls: [],
  videoUrl: "",
  linkUrl: "",
  sortOrder: 0,
};

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export function BannersEditor() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showVideoLimit, setShowVideoLimit] = useState(false);
  const [bannerType, setBannerType] = useState<BannerType>("image");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const dragDisabled = editingId !== null || status === "saving" || status === "deleting";

  const isNew = editingId === 0;
  // 목록에는 노출 타입으로 선택된 배너만 표시한다
  const visibleBanners = banners.filter((b) => (b.videoUrl ? "video" : "image") === bannerType);
  const hasVideoBanner = banners.some((b) => Boolean(b.videoUrl));
  const { getItemProps } = useDragSort(visibleBanners.length, (f, t) => void move(f, t));

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await onchurchBanner.listMine();
      setBanners(res.banners);
      setBannerType(res.bannerType);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "배너 목록을 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  // 현재 선택된 노출 타입의 배너를 바로 추가한다. 영상은 1개 제한이라 이미 있으면 안내 모달을 띄운다.
  function startNew() {
    setErrMsg("");
    if (bannerType === "video" && hasVideoBanner) {
      setShowVideoLimit(true);
      return;
    }
    setEditingId(0);
    setDraft({ ...EMPTY_DRAFT, type: bannerType, sortOrder: banners.length });
  }

  function editExistingVideo() {
    setShowVideoLimit(false);
    const videoBanner = banners.find((b) => Boolean(b.videoUrl));
    if (videoBanner) startEdit(videoBanner);
  }

  // 홈에 노출할 배너 타입 전환. 다른 타입 배너는 삭제하지 않고 보관한다.
  async function changeBannerType(type: BannerType) {
    if (type === bannerType || status === "saving") return;
    setStatus("saving");
    setErrMsg("");
    try {
      await onchurchBanner.setType(type);
      setBannerType(type);
      // 열려 있던 편집 폼은 타입이 달라지므로 닫는다
      cancel();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "노출 타입 변경에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  function startEdit(banner: Banner) {
    setEditingId(banner.id);
    setDraft({
      type: banner.videoUrl ? "video" : "image",
      imageUrls: banner.imageUrl ? [banner.imageUrl] : [],
      videoUrl: banner.videoUrl ?? "",
      linkUrl: banner.linkUrl ?? "",
      sortOrder: banner.sortOrder,
    });
  }

  function cancel() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErrMsg("");
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    let files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) {
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    // 기존 배너 편집 시에는 이미지 1장 교체만 허용
    if (!isNew) files = files.slice(0, 1);
    setErrMsg("");
    setUploading(true);
    try {
      const uploaded = await uploadImages(files);
      const urls = uploaded.map((u) => u.url).filter(Boolean);
      if (urls.length) {
        setDraft((d) => ({ ...d, imageUrls: isNew ? [...d.imageUrls, ...urls] : urls.slice(0, 1) }));
      }
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = Array.from(e.target.files ?? []).find((f) => f.type.startsWith("video/"));
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      setErrMsg("영상 파일은 최대 200MB까지 업로드할 수 있습니다.");
      return;
    }
    setErrMsg("");
    setUploading(true);
    try {
      const uploaded = await uploadVideo(file);
      if (uploaded?.url) {
        setDraft((d) => ({ ...d, videoUrl: uploaded.url }));
      }
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "영상 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function removeImageAt(index: number) {
    setDraft((d) => ({ ...d, imageUrls: d.imageUrls.filter((_, i) => i !== index) }));
  }

  const draftReady = draft.type === "image" ? draft.imageUrls.length > 0 : Boolean(draft.videoUrl);

  async function save() {
    if (!draftReady) {
      setErrMsg(draft.type === "image" ? "배너 이미지는 필수입니다." : "배너 영상은 필수입니다.");
      return;
    }
    if (isNew && draft.type === "video" && hasVideoBanner) {
      setErrMsg("영상 배너는 1개만 등록할 수 있습니다. 기존 영상 배너를 편집하거나 삭제해 주세요.");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    try {
      const linkUrl = draft.linkUrl?.trim() || null;
      const baseOrder = Number(draft.sortOrder) || 0;
      if (isNew) {
        if (draft.type === "video") {
          await onchurchBanner.create({ imageUrl: null, videoUrl: draft.videoUrl, linkUrl, sortOrder: baseOrder });
        } else {
          // 이미지 여러 장 → 배너 슬라이드 여러 개로 순서대로 생성
          for (let i = 0; i < draft.imageUrls.length; i++) {
            await onchurchBanner.create({ imageUrl: draft.imageUrls[i], videoUrl: null, linkUrl, sortOrder: baseOrder + i });
          }
        }
      } else if (editingId !== null) {
        const payload: BannerWriteInput =
          draft.type === "video"
            ? { imageUrl: null, videoUrl: draft.videoUrl, linkUrl, sortOrder: baseOrder }
            : { imageUrl: draft.imageUrls[0], videoUrl: null, linkUrl, sortOrder: baseOrder };
        await onchurchBanner.update(editingId, payload);
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
    if (!confirm("이 배너를 삭제할까요?")) return;
    setStatus("deleting");
    setErrMsg("");
    try {
      await onchurchBanner.remove(id);
      await load();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  async function move(fromIndex: number, toIndex: number) {
    setStatus("saving"); setErrMsg("");
    try {
      await applyReorder(visibleBanners, fromIndex, toIndex, (it, next) =>
        onchurchBanner.update(it.id, {
          imageUrl: it.imageUrl ?? null,
          videoUrl: it.videoUrl ?? null,
          linkUrl: it.linkUrl ?? null,
          sortOrder: next,
        }),
      );
      await load();
    } catch (err) { setErrMsg(err instanceof ApiError ? err.message : "순서 변경에 실패했습니다."); }
    finally { setStatus("idle"); }
  }

  // 편집 폼 카드. 새 배너/사진 편집은 목록 위에, 영상 편집은 미리보기 아래에 렌더링한다.
  function renderEditorCard() {
    return (
      <div className="admin-banner-card editing">
        <div className="form-grid">
          {draft.type === "image" && (
            <div className="form-row full">
              <label>배너 이미지 <span className="required-mark" aria-hidden="true">*</span></label>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                {draft.imageUrls.map((url, i) => (
                  <div key={`${url}-${i}`} style={{ position: "relative", width: 180, height: 100, borderRadius: "var(--r-sm)", overflow: "hidden", background: "var(--surface-2)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      aria-label="제거"
                      onClick={() => removeImageAt(i)}
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "oklch(0 0 0 / 0.6)", color: "white", border: "none", cursor: "pointer", fontSize: 13, lineHeight: 1, display: "grid", placeItems: "center" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  <input ref={imageInputRef} type="file" accept="image/*" multiple={isNew} onChange={onPickImages} style={{ display: "none" }} />
                  <button type="button" className="btn btn-secondary" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                    {uploading ? "업로드 중..." : draft.imageUrls.length ? (isNew ? "이미지 추가" : "이미지 교체") : "이미지 업로드"}
                  </button>
                  <span className="form-hint" style={{ fontSize: 12 }}>
                    권장 16:9 · 1920×1080 · JPG/PNG · 최대 32MB{isNew ? " · 여러 장을 올리면 각각 슬라이드로 등록됩니다" : ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          {draft.type === "video" && (
            <div className="form-row full">
              <label>배너 영상 <span className="required-mark" aria-hidden="true">*</span></label>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                {draft.videoUrl && (
                  <div style={{ position: "relative", width: 180, height: 100, borderRadius: "var(--r-sm)", overflow: "hidden", background: "var(--surface-2)" }}>
                    <video src={draft.videoUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      aria-label="제거"
                      onClick={() => setDraft((d) => ({ ...d, videoUrl: "" }))}
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "oklch(0 0 0 / 0.6)", color: "white", border: "none", cursor: "pointer", fontSize: 13, lineHeight: 1, display: "grid", placeItems: "center" }}
                    >
                      ×
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" onChange={onPickVideo} style={{ display: "none" }} />
                  <button type="button" className="btn btn-secondary" onClick={() => videoInputRef.current?.click()} disabled={uploading}>
                    {uploading ? "업로드 중..." : draft.videoUrl ? "영상 교체" : "영상 업로드"}
                  </button>
                  <span className="form-hint" style={{ fontSize: 12 }}>MP4/WebM · 최대 200MB · 소리 없이 자동 반복 재생됩니다 · 용량이 클수록 첫 화면 로딩이 느려지니 압축을 권장합니다</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-row full">
            <label htmlFor="bn-link">클릭 시 이동할 URL</label>
            <input
              id="bn-link"
              type="url"
              value={draft.linkUrl ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, linkUrl: e.target.value }))}
              placeholder="https://... (선택)"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>
            취소
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || uploading || !draftReady}>
            {status === "saving" ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">BANNERS</div>
        <h2>홈 상단 배너</h2>
        <p>홈페이지 최상단에 노출되는 배너입니다. 등록된 배너가 없으면 기본 환영 배너가 자동으로 표시됩니다.</p>
        <p style={{ marginTop: 4, color: "var(--muted)", fontSize: 13 }}>
          배너는 <strong>가로:세로 16:9 비율</strong>로 표시됩니다. 권장 크기 <strong>1920×1080</strong>(또는 1280×720)으로 올리면 잘리지 않습니다. 다른 비율의 이미지는 가운데를 기준으로 잘릴 수 있습니다.
        </p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}

        <div className="banner-toolbar">
          <div className="banner-toolbar-left">
            <span className="banner-type-label">홈에 노출할 배너</span>
            <div className="banner-type-toggle" role="group" aria-label="홈에 노출할 배너 타입">
              <button
                type="button"
                className={bannerType === "image" ? "active" : ""}
                onClick={() => changeBannerType("image")}
                disabled={status === "saving"}
                aria-pressed={bannerType === "image"}
              >
                🖼 사진
              </button>
              <button
                type="button"
                className={bannerType === "video" ? "active" : ""}
                onClick={() => changeBannerType("video")}
                disabled={status === "saving"}
                aria-pressed={bannerType === "video"}
              >
                🎬 영상
              </button>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary banner-add-btn"
            onClick={startNew}
            disabled={editingId !== null}
          >
            + 배너 추가
          </button>
        </div>
        <p className="banner-type-hint">
          선택한 타입의 배너만 홈에 노출됩니다. 다른 타입 배너는 삭제되지 않고 보관됩니다.
        </p>

        {editingId !== null && (isNew || draft.type !== "video") && renderEditorCard()}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
          {status !== "loading" && visibleBanners.length === 0 && editingId === null && (
            <p style={{ color: "var(--muted)" }}>
              {banners.length === 0
                ? "등록된 배너가 없습니다. 새 배너를 추가해보세요. 등록 전까지는 기본 환영 배너가 노출됩니다."
                : `등록된 ${bannerType === "video" ? "영상" : "사진"} 배너가 없습니다. 새 배너를 추가하거나 노출 타입을 바꿔보세요.`}
            </p>
          )}
          {bannerType === "video"
            ? visibleBanners.map((b) => (
                <Fragment key={b.id}>
                  <div className="banner-video-preview">
                    {b.videoUrl && (
                      <video src={b.videoUrl} controls muted loop playsInline preload="metadata" />
                    )}
                    <div className="banner-video-preview-meta">
                      <div className="banner-link">
                        {b.linkUrl ? `→ ${b.linkUrl}` : "이동 링크 없음"}
                      </div>
                      <div className="banner-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => startEdit(b)} disabled={editingId !== null}>
                          편집
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => remove(b.id)} disabled={status === "deleting"}>
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                  {editingId === b.id && renderEditorCard()}
                </Fragment>
              ))
            : visibleBanners.map((b, idx) => (
                <div
                  key={b.id}
                  className="admin-banner-card"
                  {...(dragDisabled ? {} : getItemProps(idx))}
                >
                  <DragHandle disabled={dragDisabled} />
                  {b.imageUrl && (
                    <div className="banner-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.imageUrl} alt="" />
                    </div>
                  )}
                  <div className="banner-meta">
                    {b.linkUrl ? (
                      <div className="banner-link">→ {b.linkUrl}</div>
                    ) : (
                      <div className="banner-link">이동 링크 없음</div>
                    )}
                  </div>
                  <div className="banner-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => startEdit(b)} disabled={editingId !== null}>
                      편집
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => remove(b.id)} disabled={status === "deleting"}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {showVideoLimit && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowVideoLimit(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title">영상 배너는 1개만 등록할 수 있어요</h3>
            <p className="admin-modal-body">
              이미 등록된 영상 배너가 있습니다. 새 영상으로 바꾸려면 기존 영상 배너를 <strong>편집</strong>해서 교체하거나, 삭제 후 다시 추가해 주세요.
            </p>
            <div className="admin-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowVideoLimit(false)}>
                닫기
              </button>
              <button type="button" className="btn btn-primary" onClick={editExistingVideo}>
                기존 영상 편집
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
