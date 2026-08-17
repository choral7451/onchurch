"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, onchurchBanner, uploadImages, uploadFiles, type Banner, type BannerWriteInput } from "@/lib/api-client";
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

const MAX_VIDEO_BYTES = 32 * 1024 * 1024;

export function BannersEditor() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [choosingType, setChoosingType] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const dragDisabled = editingId !== null || status === "saving" || status === "deleting";
  const { getItemProps } = useDragSort(banners.length, (f, t) => void move(f, t));

  const isNew = editingId === 0;

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await onchurchBanner.listMine();
      setBanners(res.banners);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "배너 목록을 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  function startNew() {
    setChoosingType(true);
    setErrMsg("");
  }

  function pickType(type: BannerType) {
    setChoosingType(false);
    setEditingId(0);
    setDraft({ ...EMPTY_DRAFT, type, sortOrder: banners.length });
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
    setChoosingType(false);
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
      setErrMsg("영상 파일은 최대 32MB까지 업로드할 수 있습니다.");
      return;
    }
    setErrMsg("");
    setUploading(true);
    try {
      const [uploaded] = await uploadFiles([file]);
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
    setStatus("saving");
    setErrMsg("");
    try {
      const linkUrl = draft.type === "video" ? null : draft.linkUrl?.trim() || null;
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
      await applyReorder(banners, fromIndex, toIndex, (it, next) =>
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

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary" onClick={startNew} disabled={editingId !== null || choosingType}>
            + 새 배너 추가
          </button>
        </div>

        {choosingType && (
          <div className="admin-banner-card editing">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontWeight: 600 }}>어떤 배너를 추가할까요?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn btn-secondary" onClick={() => pickType("image")}>
                  🖼 사진 배너 (여러 장 가능)
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => pickType("video")}>
                  🎬 영상 배너
                </button>
                <button type="button" className="btn btn-ghost" onClick={cancel}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {editingId !== null && (
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
                      <span className="form-hint" style={{ fontSize: 12 }}>MP4/WebM · 최대 32MB · 10~20초 내외의 짧은 영상 권장 · 소리 없이 자동 반복 재생됩니다</span>
                    </div>
                  </div>
                </div>
              )}

              {draft.type === "image" && (
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
              )}
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
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
          {status !== "loading" && banners.length === 0 && editingId === null && (
            <p style={{ color: "var(--muted)" }}>등록된 배너가 없습니다. 새 배너를 추가해보세요. 등록 전까지는 기본 환영 배너가 노출됩니다.</p>
          )}
          {banners.map((b, idx) => (
            <div
              key={b.id}
              className="admin-banner-card"
              {...(dragDisabled ? {} : getItemProps(idx))}
            >
              <DragHandle disabled={dragDisabled} />
              {b.videoUrl ? (
                <div className="banner-thumb">
                  <video src={b.videoUrl} muted playsInline preload="metadata" />
                </div>
              ) : b.imageUrl ? (
                <div className="banner-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt="" />
                </div>
              ) : null}
              <div className="banner-meta">
                {b.videoUrl ? (
                  <div className="banner-link">🎬 영상 배너</div>
                ) : b.linkUrl ? (
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
    </section>
  );
}
