"use client";

import { useEffect, useState } from "react";
import { ApiError, onchurchBanner, type Banner, type BannerWriteInput } from "@/lib/api-client";
import { SortPositionSelect } from "@/components/admin/sort-position-select";
import { applyReorder } from "@/lib/admin-reorder";

type Status = "idle" | "loading" | "saving" | "deleting";

const EMPTY_INPUT: BannerWriteInput = {
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  sortOrder: 0,
  isActive: true,
};

export function BannersEditor() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<BannerWriteInput>(EMPTY_INPUT);

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
      title: banner.title,
      description: banner.description ?? "",
      imageUrl: banner.imageUrl ?? "",
      linkUrl: banner.linkUrl ?? "",
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
    });
  }

  function cancel() {
    setEditingId(null);
    setDraft(EMPTY_INPUT);
    setErrMsg("");
  }

  async function save() {
    if (!draft.title.trim()) {
      setErrMsg("배너 제목은 필수입니다.");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    try {
      const payload: BannerWriteInput = {
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        imageUrl: draft.imageUrl?.trim() || null,
        linkUrl: draft.linkUrl?.trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
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
          title: it.title,
          description: it.description ?? null,
          imageUrl: it.imageUrl ?? null,
          linkUrl: it.linkUrl ?? null,
          sortOrder: next,
          isActive: it.isActive,
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
                <label htmlFor="bn-title">제목 <span className="required-mark" aria-hidden="true">*</span></label>
                <input
                  id="bn-title"
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="봄 부흥회 안내"
                  required
                />
              </div>
              <div className="form-row full">
                <label htmlFor="bn-desc">설명</label>
                <input
                  id="bn-desc"
                  type="text"
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="3월 15일 오후 7시 본당"
                />
              </div>
              <div className="form-row">
                <label htmlFor="bn-image">배경 이미지 URL</label>
                <input
                  id="bn-image"
                  type="url"
                  value={draft.imageUrl ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="form-row">
                <label htmlFor="bn-link">클릭 시 이동할 URL</label>
                <input
                  id="bn-link"
                  type="url"
                  value={draft.linkUrl ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, linkUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="form-row">
                <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28 }}>
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  />
                  <span>활성</span>
                </label>
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
          {status !== "loading" && banners.length === 0 && editingId === null && (
            <p style={{ color: "var(--muted)" }}>등록된 배너가 없습니다. 새 배너를 추가해보세요. 등록 전까지는 기본 환영 배너가 노출됩니다.</p>
          )}
          {banners.map((b, idx) => (
            <div key={b.id} className={`admin-banner-card ${b.isActive ? "" : "inactive"}`}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <strong>{b.title}</strong>
                  <span className={`admin-sidebar-pill ${b.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                    {b.isActive ? "활성" : "비활성"}
                  </span>
                  <SortPositionSelect
                    index={idx}
                    total={banners.length}
                    onMove={(next) => void move(idx, next)}
                    disabled={editingId !== null || status === "saving"}
                  />
                </div>
                {b.description && <div style={{ color: "var(--muted)", fontSize: 13 }}>{b.description}</div>}
                {b.linkUrl && <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>→ {b.linkUrl}</div>}
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
