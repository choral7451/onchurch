"use client";

import { useEffect, useState } from "react";
import { ApiError, onchurchEvent, type EventItem, type EventWriteInput } from "@/lib/api-client";

type Status = "idle" | "loading" | "saving" | "deleting";

const EMPTY_INPUT: EventWriteInput = {
  title: "",
  description: "",
  location: "",
  startAt: "",
  endAt: "",
  isAllDay: false,
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatRange(startIso: string, endIso: string | null, isAllDay: boolean): string {
  const s = new Date(startIso);
  const sLabel = `${s.getFullYear()}.${String(s.getMonth() + 1).padStart(2, "0")}.${String(s.getDate()).padStart(2, "0")}`;
  const sTime = isAllDay ? "" : ` ${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
  if (!endIso) return `${sLabel}${sTime}`;
  const e = new Date(endIso);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay && !isAllDay) {
    return `${sLabel}${sTime} – ${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;
  }
  const eLabel = `${e.getFullYear()}.${String(e.getMonth() + 1).padStart(2, "0")}.${String(e.getDate()).padStart(2, "0")}`;
  return `${sLabel}${sTime} – ${eLabel}`;
}

export function ScheduleEditor() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EventWriteInput>(EMPTY_INPUT);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await onchurchEvent.listMine();
      setEvents(res.events);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "일정 목록을 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  function startNew() {
    setEditingId(0);
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    setDraft({ ...EMPTY_INPUT, startAt: toLocalInput(now.toISOString()) });
  }

  function startEdit(ev: EventItem) {
    setEditingId(ev.id);
    setDraft({
      title: ev.title,
      description: ev.description ?? "",
      location: ev.location ?? "",
      startAt: toLocalInput(ev.startAt),
      endAt: toLocalInput(ev.endAt),
      isAllDay: ev.isAllDay,
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
    const startIso = fromLocalInput(draft.startAt);
    if (!startIso) {
      setErrMsg("시작 시각을 입력해주세요.");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    try {
      const payload: EventWriteInput = {
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        location: draft.location?.trim() || null,
        startAt: startIso,
        endAt: fromLocalInput(draft.endAt ?? ""),
        isAllDay: !!draft.isAllDay,
      };
      if (editingId === 0 || editingId === null) {
        await onchurchEvent.create(payload);
      } else {
        await onchurchEvent.update(editingId, payload);
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
    if (!confirm("이 일정을 삭제할까요?")) return;
    setStatus("deleting");
    setErrMsg("");
    try {
      await onchurchEvent.remove(id);
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
        <div className="admin-section-eyebrow">EVENTS</div>
        <h2>행사 캘린더</h2>
        <p>다가오는 교회 행사 일정입니다. 메인 페이지 캘린더와 일정 페이지에 노출됩니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary" onClick={startNew} disabled={editingId !== null}>
            + 새 일정 추가
          </button>
        </div>

        {editingId !== null && (
          <div className="admin-banner-card editing">
            <div className="form-grid">
              <div className="form-row full">
                <label htmlFor="ev-title">제목 <span className="required-mark" aria-hidden="true">*</span></label>
                <input
                  id="ev-title"
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="부활주일 연합예배"
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="ev-start">시작 <span className="required-mark" aria-hidden="true">*</span></label>
                <input
                  id="ev-start"
                  type="datetime-local"
                  value={draft.startAt}
                  onChange={(e) => setDraft((d) => ({ ...d, startAt: e.target.value }))}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="ev-end">종료 (선택)</label>
                <input
                  id="ev-end"
                  type="datetime-local"
                  value={draft.endAt ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, endAt: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <label htmlFor="ev-loc">장소</label>
                <input
                  id="ev-loc"
                  type="text"
                  value={draft.location ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                  placeholder="본당"
                />
              </div>
              <div className="form-row">
                <label className="checkbox-row" style={{ cursor: "pointer", marginTop: 28, gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={draft.isAllDay}
                    onChange={(e) => setDraft((d) => ({ ...d, isAllDay: e.target.checked }))}
                  />
                  <span>종일</span>
                </label>
              </div>
              <div className="form-row full">
                <label htmlFor="ev-desc">설명</label>
                <textarea
                  id="ev-desc"
                  rows={4}
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="일정 상세 설명"
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>
                취소
              </button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.title.trim() || !draft.startAt}>
                {status === "saving" ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
          {status !== "loading" && events.length === 0 && editingId === null && (
            <p style={{ color: "var(--muted)" }}>등록된 일정이 없습니다.</p>
          )}
          {events.map((ev) => (
            <div key={ev.id} className="admin-banner-card">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <strong>{ev.title}</strong>
                  {ev.isAllDay && <span className="admin-sidebar-pill optional" style={{ fontSize: 10 }}>종일</span>}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  {formatRange(ev.startAt, ev.endAt, ev.isAllDay)}
                  {ev.location && <> · {ev.location}</>}
                </div>
                {ev.description && (
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4, whiteSpace: "pre-wrap" }}>
                    {ev.description.length > 120 ? ev.description.slice(0, 120) + "..." : ev.description}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
                <button type="button" className="btn btn-ghost" onClick={() => startEdit(ev)} disabled={editingId !== null}>
                  편집
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => remove(ev.id)} disabled={status === "deleting"}>
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
