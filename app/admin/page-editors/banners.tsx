"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, onchurchBanner, uploadImages, type Banner, type BannerWriteInput } from "@/lib/api-client";
import { DragHandle } from "@/components/admin/drag-handle";
import { useDragSort } from "@/lib/use-drag-sort";
import { applyReorder } from "@/lib/admin-reorder";

type Status = "idle" | "loading" | "saving" | "deleting";

const EMPTY_INPUT: BannerWriteInput = {
  imageUrl: "",
  linkUrl: "",
  sortOrder: 0,
};

export function BannersEditor() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<BannerWriteInput>(EMPTY_INPUT);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const dragDisabled = editingId !== null || status === "saving" || status === "deleting";
  const { getItemProps } = useDragSort(banners.length, (f, t) => void move(f, t));

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
    setEditingId(0);
    setDraft({ ...EMPTY_INPUT, sortOrder: banners.length });
  }

  function startEdit(banner: Banner) {
    setEditingId(banner.id);
    setDraft({
      imageUrl: banner.imageUrl ?? "",
      linkUrl: banner.linkUrl ?? "",
      sortOrder: banner.sortOrder,
    });
  }

  function cancel() {
    setEditingId(null);
    setDraft(EMPTY_INPUT);
    setErrMsg("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = Array.from(e.target.files ?? []).find((f) => f.type.startsWith("image/"));
    if (!file) {
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    setErrMsg("");
    setUploading(true);
    try {
      const [uploaded] = await uploadImages([file]);
      if (uploaded?.url) {
        setDraft((d) => ({ ...d, imageUrl: uploaded.url }));
      }
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function save() {
    if (!draft.imageUrl.trim()) {
      setErrMsg("배너 이미지는 필수입니다.");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    try {
      const payload: BannerWriteInput = {
        imageUrl: draft.imageUrl.trim(),
        linkUrl: draft.linkUrl?.trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      if (editingId === 0 || editingId === null) {
        await onchurchBanner.create(payload);
      } else {
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
          imageUrl: it.imageUrl ?? "",
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
          <button type="button" className="btn btn-primary" onClick={startNew} disabled={editingId !== null}>
            + 새 배너 추가
          </button>
        </div>

        {editingId !== null && (
          <div className="admin-banner-card editing">
            <div className="form-grid">
              <div className="form-row full">
                <label>배너 이미지 <span className="required-mark" aria-hidden="true">*</span></label>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  {draft.imageUrl && (
                    <div style={{ position: "relative", width: 180, height: 100, borderRadius: "var(--r-sm)", overflow: "hidden", background: "var(--surface-2)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        aria-label="제거"
                        onClick={() => setDraft((d) => ({ ...d, imageUrl: "" }))}
                        style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "oklch(0 0 0 / 0.6)", color: "white", border: "none", cursor: "pointer", fontSize: 13, lineHeight: 1, display: "grid", placeItems: "center" }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
                    <button type="button" className="btn btn-secondary" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                      {uploading ? "업로드 중..." : draft.imageUrl ? "이미지 교체" : "이미지 업로드"}
                    </button>
                    <span className="form-hint" style={{ fontSize: 12 }}>권장 16:9 · 1920×1080 · JPG/PNG · 최대 32MB</span>
                  </div>
                </div>
              </div>
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
              <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || uploading || !draft.imageUrl.trim()}>
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
              {b.imageUrl && (
                <div style={{ width: 120, height: 68, borderRadius: "var(--r-sm)", overflow: "hidden", background: "var(--surface-2)", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {b.linkUrl ? (
                  <div style={{ color: "var(--muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>→ {b.linkUrl}</div>
                ) : (
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>이동 링크 없음</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
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
