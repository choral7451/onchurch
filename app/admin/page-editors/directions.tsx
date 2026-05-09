"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  onchurchTransportation,
  type TransportationItem,
  type TransportationWriteInput,
} from "@/lib/api-client";

type Status = "idle" | "loading" | "saving" | "deleting";

const TAG_OPTIONS = ["지하철", "버스", "셔틀"] as const;
type TagOption = (typeof TAG_OPTIONS)[number];

const TAG_ICONS: Record<TagOption, string> = {
  지하철: "🚇",
  버스: "🚌",
  셔틀: "🚐",
};

const DEFAULT_TAG: TagOption = "지하철";

const EMPTY: TransportationWriteInput = {
  icon: TAG_ICONS[DEFAULT_TAG],
  tag: DEFAULT_TAG,
  title: "",
  description: "",
  sortOrder: 0,
  isActive: true,
};

export function DirectionsEditor() {
  const [items, setItems] = useState<TransportationItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<TransportationWriteInput>(EMPTY);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      setItems(await onchurchTransportation.listMine());
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "교통편 목록을 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  function startNew() {
    setEditing(0);
    setDraft({ ...EMPTY, sortOrder: items.length });
  }

  function startEdit(it: TransportationItem) {
    const tag = (TAG_OPTIONS as readonly string[]).includes(it.tag)
      ? (it.tag as TagOption)
      : DEFAULT_TAG;
    setEditing(it.id);
    setDraft({
      icon: TAG_ICONS[tag],
      tag,
      title: it.title,
      description: it.description ?? "",
      sortOrder: it.sortOrder,
      isActive: it.isActive,
    });
  }

  function cancel() {
    setEditing(null);
    setDraft(EMPTY);
    setErrMsg("");
  }

  async function save() {
    if (!draft.tag.trim() || !draft.title.trim()) {
      setErrMsg("구분과 제목은 필수입니다.");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    try {
      const payload: TransportationWriteInput = {
        icon: (draft.icon ?? "").trim() || null,
        tag: draft.tag.trim(),
        title: draft.title.trim(),
        description: (draft.description ?? "").trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: !!draft.isActive,
      };
      if (editing === 0 || editing === null) await onchurchTransportation.create(payload);
      else await onchurchTransportation.update(editing, payload);
      cancel();
      await load();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  async function remove(id: number) {
    if (!confirm("이 교통편 항목을 삭제할까요?")) return;
    setStatus("deleting");
    setErrMsg("");
    try {
      await onchurchTransportation.remove(id);
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
        <div className="admin-section-eyebrow">TRANSPORT</div>
        <h2>대중교통 안내</h2>
        <p>지하철·버스·셔틀 등 교회까지 오는 방법을 카드로 소개합니다. 주소·연락처는 사이드바의 &quot;연락처&quot;에서 관리합니다.</p>
      </div>
      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>
            + 교통수단 추가
          </button>
        </div>
        {editing !== null && (
          <div className="admin-banner-card editing">
            <div className="form-grid">
              <div className="form-row">
                <label>구분 <span className="required-mark" aria-hidden="true">*</span></label>
                <select
                  value={draft.tag}
                  onChange={(e) => {
                    const tag = e.target.value as TagOption;
                    setDraft({ ...draft, tag, icon: TAG_ICONS[tag] });
                  }}
                  required
                >
                  {TAG_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {TAG_ICONS[opt]} {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row full">
                <label>제목 <span className="required-mark" aria-hidden="true">*</span></label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="왕십리역 5번 출구"
                  required
                />
              </div>
              <div className="form-row full">
                <label>설명</label>
                <textarea
                  rows={3}
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="역에서 도보 5분, 직진 후 우회전"
                />
              </div>
              <div className="form-row">
                <label>정렬</label>
                <input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="form-row">
                <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                  />
                  <span>활성</span>
                </label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>
                취소
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={save}
                disabled={status === "saving" || !draft.tag.trim() || !draft.title.trim()}
              >
                {status === "saving" ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
          {status !== "loading" && items.length === 0 && editing === null && (
            <p style={{ color: "var(--muted)" }}>등록된 교통편이 없습니다.</p>
          )}
          {items.map((it) => (
            <div key={it.id} className={`admin-banner-card ${it.isActive ? "" : "inactive"}`}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {it.icon && <span style={{ fontSize: 18 }}>{it.icon}</span>}
                  <strong>{it.tag}</strong>
                  <span>· {it.title}</span>
                  <span className={`admin-sidebar-pill ${it.isActive ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                    {it.isActive ? "공개" : "비공개"}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>순서 {it.sortOrder}</span>
                </div>
                {it.description && <div style={{ color: "var(--muted)", fontSize: 13 }}>{it.description}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
                <button type="button" className="btn btn-ghost" onClick={() => startEdit(it)} disabled={editing !== null}>
                  편집
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => remove(it.id)} disabled={status === "deleting"}>
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
