"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  onchurchVisitation,
  onchurchChurchSaint,
  type Visitation,
  type VisitationWriteInput,
  type VisitationType,
  type ChurchSaint,
} from "@/lib/api-client";

type Status = "idle" | "loading" | "saving" | "deleting";

// 저장 전에는 대상 성도가 비어있을 수 있으므로 saintId는 null 허용(저장 시 검증).
type Draft = Omit<VisitationWriteInput, "saintId"> & { saintId: number | null };

const EMPTY_DRAFT: Draft = {
  saintId: null,
  saintName: "",
  participants: null,
  minister: "",
  type: "",
  date: "",
  content: null,
};

// 숫자만 입력하면 YYYY-MM-DD 형태로 하이픈을 자동 삽입한다.
function formatDateInput(v: string): string {
  const d = v.replace(/[^0-9]/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

function isValidDate(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

// 심방 종류 추가·삭제 관리 패널.
function TypeManager({
  types,
  onChanged,
}: {
  types: VisitationType[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");

  async function add() {
    const v = name.trim();
    if (!v) return;
    setStatus("saving");
    setErrMsg("");
    try {
      await onchurchVisitation.createType(v);
      setName("");
      onChanged();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "추가에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  async function remove(id: number) {
    setStatus("deleting");
    setErrMsg("");
    try {
      await onchurchVisitation.removeType(id);
      onChanged();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <strong style={{ fontSize: 14 }}>심방 종류 관리</strong>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {types.length === 0 ? (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>등록된 종류가 없습니다.</span>
        ) : (
          types.map((t) => (
            <span
              key={t.id}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 12px", border: "1px solid var(--line)", borderRadius: 999, fontSize: 13, background: "var(--surface-2)" }}
            >
              {t.name}
              <button
                type="button"
                aria-label={`${t.name} 삭제`}
                onClick={() => remove(t.id)}
                disabled={status === "deleting"}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 15, lineHeight: 1, padding: "0 2px" }}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
          placeholder="새 종류 (예: 구역심방)"
          maxLength={40}
          style={{ flex: "1 1 160px", minWidth: 140, padding: "9px 14px", fontSize: 13, border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--surface)", fontFamily: "inherit" }}
        />
        <button type="button" className="btn btn-secondary" onClick={add} disabled={status === "saving" || !name.trim()}>
          {status === "saving" ? "추가 중..." : "종류 추가"}
        </button>
      </div>
    </div>
  );
}

function DetailItem({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={`saint-detail-item${full ? " full" : ""}`}>
      <span className="saint-detail-k">{label}</span>
      <span className="saint-detail-v">{value || <span style={{ color: "var(--muted-2)" }}>—</span>}</span>
    </div>
  );
}

export function VisitationsEditor({
  focusId = null,
  onFocusConsumed,
  onBackToOrigin,
}: {
  focusId?: number | null;
  onFocusConsumed?: () => void;
  onBackToOrigin?: () => void;
} = {}) {
  const [visitations, setVisitations] = useState<Visitation[]>([]);
  const [types, setTypes] = useState<VisitationType[]>([]);
  const [saints, setSaints] = useState<ChurchSaint[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [query, setQuery] = useState("");
  const [showTypes, setShowTypes] = useState(false);
  // 성도 상세에서 넘어온 심방 상세인지 — '뒤로'를 성도 상세로 보낼지 판단.
  const [arrivedFromSaint, setArrivedFromSaint] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  // 성도 상세에서 넘어온 경우 해당 심방 상세를 바로 연다(한 번만 소비).
  useEffect(() => {
    if (focusId == null) return;
    setDetailId(focusId);
    setEditing(null);
    setArrivedFromSaint(true);
    onFocusConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      const [v, t, s] = await Promise.all([
        onchurchVisitation.listMine(),
        onchurchVisitation.listTypes(),
        onchurchChurchSaint.listMine(),
      ]);
      setVisitations(v);
      setTypes(t);
      setSaints(s);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "심방 기록을 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  async function reloadTypes() {
    try {
      setTypes(await onchurchVisitation.listTypes());
    } catch {
      /* noop */
    }
  }

  function startNew() {
    setDetailId(null);
    setEditing(0);
    setErrMsg("");
    setArrivedFromSaint(false);
    setDraft({ ...EMPTY_DRAFT, type: types[0]?.name ?? "" });
  }

  function openDetail(v: Visitation) {
    setDetailId(v.id);
    setEditing(null);
    setErrMsg("");
    setArrivedFromSaint(false);
  }

  function startEdit(v: Visitation) {
    setEditing(v.id);
    setErrMsg("");
    setDraft({
      saintId: v.saintId,
      saintName: v.saintName,
      participants: v.participants,
      minister: v.minister,
      type: v.type,
      date: v.date,
      content: v.content,
    });
  }

  function cancel() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setErrMsg("");
  }

  async function save() {
    if (draft.saintId == null) {
      setErrMsg("심방 대상 성도를 성도명부에서 선택해주세요.");
      return;
    }
    if (!draft.minister.trim()) {
      setErrMsg("교역자를 입력해주세요.");
      return;
    }
    if (!draft.type.trim()) {
      setErrMsg("심방 종류를 선택해주세요.");
      return;
    }
    if (!isValidDate(draft.date)) {
      setErrMsg("날짜 형식이 올바르지 않습니다. 예) 2026-06-27");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    try {
      const payload: VisitationWriteInput = {
        saintId: draft.saintId,
        saintName: draft.saintName.trim(),
        participants: draft.participants?.trim() || null,
        minister: draft.minister.trim(),
        type: draft.type.trim(),
        date: draft.date.trim(),
        content: draft.content?.trim() || null,
      };
      if (editing === 0 || editing === null) {
        await onchurchVisitation.create(payload);
        setDetailId(null);
      } else {
        await onchurchVisitation.update(editing, payload);
        setDetailId(editing); // 수정 후에는 해당 심방 상세로 복귀
      }
      await load();
      setEditing(null);
      setDraft(EMPTY_DRAFT);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
      setStatus("idle");
    }
  }

  async function remove(v: Visitation) {
    if (!confirm(`'${v.saintName}' 성도의 ${v.date} 심방 기록을 삭제할까요?`)) return;
    setStatus("deleting");
    setErrMsg("");
    try {
      await onchurchVisitation.remove(v.id);
      if (detailId === v.id) setDetailId(null);
      await load();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
      setStatus("idle");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visitations;
    return visitations.filter(
      (v) =>
        v.saintName.toLowerCase().includes(q) ||
        v.minister.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        (v.content ?? "").toLowerCase().includes(q),
    );
  }, [visitations, query]);

  // 편집 중인 기록의 종류가 목록에서 삭제됐어도 select에서 보이도록 보강.
  const typeOptions = useMemo(() => {
    const names = types.map((t) => t.name);
    if (draft.type && !names.includes(draft.type)) return [draft.type, ...names];
    return names;
  }, [types, draft.type]);

  const busy = status === "saving" || status === "deleting";
  const detailVisit = detailId != null ? visitations.find((v) => v.id === detailId) ?? null : null;

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">VISITATION</div>
        <h2>심방 관리</h2>
        <p>성도 심방 기록을 남기고 관리합니다. 성도명부에서 대상을 선택해 기록하고, 심방 종류도 직접 추가할 수 있습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {detailVisit && editing === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (arrivedFromSaint && onBackToOrigin) onBackToOrigin();
                  else setDetailId(null);
                }}
              >
                {arrivedFromSaint && onBackToOrigin ? "← 성도 상세" : "← 목록"}
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-primary" onClick={() => startEdit(detailVisit)} disabled={busy}>편집</button>
                <button type="button" className="btn btn-ghost" onClick={() => remove(detailVisit)} disabled={busy}>삭제</button>
              </div>
            </div>

            <div className="admin-banner-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 20 }}>{detailVisit.saintName}</strong>
                <span className="admin-sidebar-pill optional" style={{ fontSize: 11 }}>{detailVisit.type}</span>
                <span style={{ color: "var(--muted)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{detailVisit.date}</span>
              </div>
              <div className="saint-detail-grid">
                <DetailItem label="심방 대상" value={detailVisit.saintName} />
                <DetailItem label="교역자" value={detailVisit.minister} />
                <DetailItem label="심방 종류" value={detailVisit.type} />
                <DetailItem label="날짜" value={detailVisit.date} />
                <DetailItem label="참여 성도" value={detailVisit.participants} full />
                <DetailItem label="내용" value={detailVisit.content ? <span style={{ whiteSpace: "pre-wrap" }}>{detailVisit.content}</span> : null} full />
              </div>
            </div>
          </div>
        ) : (
        <>
        {errMsg && editing === null && <div className="phone-msg phone-msg-error">{errMsg}</div>}

        {editing === null && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>총 {visitations.length}건</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="성도·교역자·종류·내용 검색"
                className="member-search"
                style={{ padding: "9px 14px", fontSize: 13, border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface)", fontFamily: "inherit" }}
              />
              <button type="button" className="btn btn-secondary" onClick={() => setShowTypes((s) => !s)}>
                {showTypes ? "종류 닫기" : "종류 관리"}
              </button>
              <button type="button" className="btn btn-primary" onClick={startNew}>
                + 심방 기록
              </button>
            </div>
          </div>
        )}

        {editing === null && showTypes && <TypeManager types={types} onChanged={reloadTypes} />}

        {editing !== null && (
          <div className="admin-banner-card editing">
            {errMsg && <div className="phone-msg phone-msg-error" style={{ marginBottom: 12 }}>{errMsg}</div>}
            <div className="form-grid">
              <div className="form-row">
                <label>심방 대상 성도 <span className="required-mark" aria-hidden="true">*</span></label>
                <select
                  value={draft.saintId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    const picked = saints.find((s) => s.id === id);
                    setDraft({ ...draft, saintId: id, saintName: picked ? picked.name : "" });
                  }}
                >
                  <option value="">성도명부에서 선택</option>
                  {saints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.position ? ` (${s.position})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>참여 성도</label>
                <input
                  value={draft.participants ?? ""}
                  onChange={(e) => setDraft({ ...draft, participants: e.target.value })}
                  placeholder="심방에 참여한 성도 (예: 홍길동, 김영희)"
                />
              </div>
              <div className="form-row">
                <label>날짜 <span className="required-mark" aria-hidden="true">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: formatDateInput(e.target.value) })}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                />
              </div>
              <div className="form-row">
                <label>교역자 <span className="required-mark" aria-hidden="true">*</span></label>
                <input
                  value={draft.minister}
                  onChange={(e) => setDraft({ ...draft, minister: e.target.value })}
                  placeholder="김목사"
                />
              </div>
              <div className="form-row">
                <label>심방 종류 <span className="required-mark" aria-hidden="true">*</span></label>
                <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                  <option value="">선택</option>
                  {typeOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row full">
                <label>내용</label>
                <textarea
                  value={draft.content ?? ""}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  placeholder="심방 내용을 기록하세요."
                  rows={5}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>닫기</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving"}>
                {status === "saving" ? "저장 중..." : editing && editing > 0 ? "수정 저장" : "등록"}
              </button>
            </div>
          </div>
        )}

        {editing === null && (status === "loading" ? (
          <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>{visitations.length === 0 ? "아직 등록된 심방 기록이 없습니다." : "검색 결과가 없습니다."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => openDetail(v)}
                className="admin-banner-card"
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", background: "var(--surface)", padding: "10px 14px" }}
              >
                <strong style={{ fontSize: 14, flexShrink: 0 }}>{v.saintName}</strong>
                <span className="admin-sidebar-pill optional" style={{ fontSize: 10, flexShrink: 0 }}>{v.type}</span>
                <span style={{ color: "var(--muted)", fontSize: 12, flexShrink: 0 }}>{v.minister}</span>
                <span style={{ color: "var(--muted)", fontSize: 12, fontVariantNumeric: "tabular-nums", marginLeft: "auto", flexShrink: 0 }}>{v.date}</span>
                <span aria-hidden="true" style={{ color: "var(--muted-2)", fontSize: 18, flexShrink: 0 }}>›</span>
              </button>
            ))}
          </div>
        ))}
        </>
        )}
      </div>
    </section>
  );
}
