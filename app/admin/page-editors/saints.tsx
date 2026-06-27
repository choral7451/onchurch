"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  onchurchChurchSaint,
  onchurchVisitation,
  uploadImages,
  type ChurchSaint,
  type ChurchSaintWriteInput,
  type SaintGender,
  type SaintRelation,
  type Visitation,
} from "@/lib/api-client";

type Status = "idle" | "loading" | "saving" | "deleting";

const POSITIONS = ["목사", "부목사", "강도사", "전도사", "장로", "권사", "안수집사", "집사", "성도"];
const FAITH_LEVELS = ["등록", "학습", "세례", "입교", "유아세례", "어린이세례"];
const RELATION_TYPES = ["배우자", "부모", "자녀", "형제자매", "조부모", "손자녀", "친척", "기타"];

const GENDER_LABEL: Record<SaintGender, string> = { male: "남", female: "여" };

const EMPTY_SAINT: ChurchSaintWriteInput = {
  name: "",
  photoUrl: null,
  birthDate: null,
  gender: null,
  phone: null,
  email: null,
  address: null,
  position: null,
  ordinationDate: null,
  faithLevel: null,
};

// 한국 전화번호 형식으로 자동 정리(숫자만 추출 후 하이픈 삽입).
function formatPhone(v: string): string {
  const d = v.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

function isValidPhone(v: string): boolean {
  if (!v.trim()) return true; // 선택 항목
  return /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v.trim());
}

function isValidEmail(v: string): boolean {
  if (!v.trim()) return true; // 선택 항목
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// 숫자만 입력하면 YYYY-MM-DD 형태로 하이픈을 자동 삽입한다.
function formatDateInput(v: string): string {
  const d = v.replace(/[^0-9]/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

function isValidDate(v: string): boolean {
  if (!v.trim()) return true; // 선택 항목
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

function PhotoUploadField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrMsg("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setErrMsg("");
    setUploading(true);
    try {
      const [uploaded] = await uploadImages([file]);
      if (uploaded?.url) onChange(uploaded.url);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="form-row full">
      <label>사진</label>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "var(--r-md)",
            border: "1px dashed var(--muted-2)",
            background: "var(--surface-2)",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ color: "var(--muted)", fontSize: 11 }}>미리보기</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "업로드 중..." : value ? "사진 변경" : "사진 업로드"}
          </button>
          {value && (
            <button type="button" className="btn btn-ghost" onClick={() => onChange(null)} disabled={uploading}>
              제거
            </button>
          )}
          <span className="form-hint" style={{ fontSize: 12 }}>JPG/PNG · 최대 32MB</span>
          {errMsg && <span style={{ color: "oklch(0.55 0.18 28)", fontSize: 12 }}>{errMsg}</span>}
        </div>
      </div>
    </div>
  );
}

function SaintAvatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "var(--surface-2)",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        border: "1px solid var(--line)",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ color: "var(--muted)", fontSize: size * 0.4, fontWeight: 700 }}>{name.slice(0, 1)}</span>
      )}
    </div>
  );
}

// 편집 중인 성도의 가족관계 관리.
function RelationsEditor({ saint, others }: { saint: ChurchSaint; others: ChurchSaint[] }) {
  const [relations, setRelations] = useState<SaintRelation[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [targetId, setTargetId] = useState<string>("");
  const [relType, setRelType] = useState<string>(RELATION_TYPES[0]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saint.id]);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      setRelations(await onchurchChurchSaint.listRelations(saint.id));
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "가족관계를 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  async function add() {
    if (!targetId) {
      setErrMsg("가족으로 연결할 성도를 선택해주세요.");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    try {
      await onchurchChurchSaint.addRelation(saint.id, Number(targetId), relType);
      setTargetId("");
      setRelType(RELATION_TYPES[0]);
      await load();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "가족관계 추가에 실패했습니다.");
      setStatus("idle");
    }
  }

  async function remove(relationId: number) {
    setStatus("deleting");
    setErrMsg("");
    try {
      await onchurchChurchSaint.removeRelation(relationId);
      await load();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
      setStatus("idle");
    }
  }

  const linkedIds = new Set(relations.map((r) => r.relatedSaintId));
  const selectable = others.filter((o) => o.id !== saint.id && !linkedIds.has(o.id));

  return (
    <div
      style={{
        marginTop: 8,
        padding: 16,
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <strong style={{ fontSize: 14 }}>가족관계</strong>
      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}

      {status === "loading" ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>불러오는 중...</p>
      ) : relations.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>등록된 가족이 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {relations.map((r) => (
            <div
              key={r.id}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}
            >
              <SaintAvatar url={r.relatedSaintPhotoUrl} name={r.relatedSaintName} size={32} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{r.relatedSaintName}</span>
              <span className="admin-sidebar-pill optional" style={{ fontSize: 10 }}>{r.relation}</span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginLeft: "auto" }}
                onClick={() => remove(r.id)}
                disabled={status === "deleting"}
              >
                해제
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ flex: "1 1 160px", minWidth: 140 }}>
          <option value="">성도 선택...</option>
          {selectable.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.position ? ` (${o.position})` : ""}
            </option>
          ))}
        </select>
        <select value={relType} onChange={(e) => setRelType(e.target.value)} style={{ flex: "0 0 120px" }}>
          {RELATION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary" onClick={add} disabled={status === "saving" || !targetId}>
          {status === "saving" ? "추가 중..." : "가족 추가"}
        </button>
      </div>
      {selectable.length === 0 && others.length > 0 && (
        <span className="form-hint" style={{ fontSize: 12 }}>연결할 수 있는 다른 성도가 없습니다.</span>
      )}
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

function SaintDetail({
  saint,
  onEdit,
  onRemove,
  onBack,
  onOpenSaint,
  busy,
}: {
  saint: ChurchSaint;
  onEdit: () => void;
  onRemove: () => void;
  onBack: () => void;
  onOpenSaint: (saintId: number) => void;
  busy: boolean;
}) {
  const [relations, setRelations] = useState<SaintRelation[]>([]);
  const [loadingRel, setLoadingRel] = useState(true);
  const [visitations, setVisitations] = useState<Visitation[]>([]);
  const [loadingVisit, setLoadingVisit] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRel(true);
      try {
        const rel = await onchurchChurchSaint.listRelations(saint.id);
        if (!cancelled) setRelations(rel);
      } catch {
        if (!cancelled) setRelations([]);
      } finally {
        if (!cancelled) setLoadingRel(false);
      }
    })();
    (async () => {
      setLoadingVisit(true);
      try {
        const v = await onchurchVisitation.listBySaint(saint.id);
        if (!cancelled) setVisitations(v);
      } catch {
        if (!cancelled) setVisitations([]);
      } finally {
        if (!cancelled) setLoadingVisit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [saint.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>← 목록</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={onEdit} disabled={busy}>편집</button>
          <button type="button" className="btn btn-ghost" onClick={onRemove} disabled={busy}>삭제</button>
        </div>
      </div>

      <div className="admin-banner-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <SaintAvatar url={saint.photoUrl} name={saint.name} size={72} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 20 }}>{saint.name}</strong>
            {saint.position && <span className="admin-sidebar-pill optional" style={{ fontSize: 11 }}>{saint.position}</span>}
          </div>
        </div>

        <div className="saint-detail-grid">
          <DetailItem label="생년월일" value={saint.birthDate} />
          <DetailItem label="성별" value={saint.gender ? GENDER_LABEL[saint.gender] : null} />
          <DetailItem label="연락처" value={saint.phone} />
          <DetailItem label="이메일" value={saint.email} />
          <DetailItem label="직분" value={saint.position} />
          <DetailItem label="임직일" value={saint.ordinationDate} />
          <DetailItem label="신급" value={saint.faithLevel} />
          <DetailItem label="주소" value={saint.address} full />
        </div>
      </div>

      <div className="admin-banner-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <strong style={{ fontSize: 14 }}>가족관계</strong>
        {loadingRel ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>불러오는 중...</p>
        ) : relations.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>등록된 가족이 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {relations.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onOpenSaint(r.relatedSaintId)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", background: "var(--surface)" }}
              >
                <SaintAvatar url={r.relatedSaintPhotoUrl} name={r.relatedSaintName} size={32} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{r.relatedSaintName}</span>
                <span className="admin-sidebar-pill optional" style={{ fontSize: 10 }}>{r.relation}</span>
                <span aria-hidden="true" style={{ marginLeft: "auto", color: "var(--muted-2)", fontSize: 16 }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="admin-banner-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10 }}>
        <strong style={{ fontSize: 14 }}>심방 기록</strong>
        {loadingVisit ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>불러오는 중...</p>
        ) : visitations.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>등록된 심방 기록이 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visitations.map((v) => (
              <div
                key={v.id}
                style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="admin-sidebar-pill optional" style={{ fontSize: 10 }}>{v.type}</span>
                  <span style={{ color: "var(--muted)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{v.date}</span>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>· {v.minister}</span>
                </div>
                {v.content && (
                  <p style={{ fontSize: 13, color: "var(--ink)", margin: 0, whiteSpace: "pre-wrap" }}>{v.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SaintsEditor() {
  const [saints, setSaints] = useState<ChurchSaint[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ChurchSaintWriteInput>(EMPTY_SAINT);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      setSaints(await onchurchChurchSaint.listMine());
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "성도 목록을 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  function startNew() {
    setDetailId(null);
    setEditing(0);
    setDraft(EMPTY_SAINT);
    setErrMsg("");
  }

  function openDetail(s: ChurchSaint) {
    setDetailId(s.id);
    setEditing(null);
    setErrMsg("");
  }

  function startEdit(s: ChurchSaint) {
    setEditing(s.id);
    setErrMsg("");
    setDraft({
      name: s.name,
      photoUrl: s.photoUrl,
      birthDate: s.birthDate,
      gender: s.gender,
      phone: s.phone,
      email: s.email,
      address: s.address,
      position: s.position,
      ordinationDate: s.ordinationDate,
      faithLevel: s.faithLevel,
    });
  }

  function cancel() {
    setEditing(null);
    setDraft(EMPTY_SAINT);
    setErrMsg("");
  }

  async function save() {
    if (!draft.name.trim()) {
      setErrMsg("이름은 필수입니다.");
      return;
    }
    if (!isValidPhone(draft.phone ?? "")) {
      setErrMsg("연락처 형식이 올바르지 않습니다. 예) 010-1234-5678");
      return;
    }
    if (!isValidEmail(draft.email ?? "")) {
      setErrMsg("이메일 형식이 올바르지 않습니다.");
      return;
    }
    if (!isValidDate(draft.birthDate ?? "")) {
      setErrMsg("생년월일 형식이 올바르지 않습니다. 예) 1990-01-15");
      return;
    }
    if (!isValidDate(draft.ordinationDate ?? "")) {
      setErrMsg("임직일 형식이 올바르지 않습니다. 예) 2015-03-20");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    try {
      const payload: ChurchSaintWriteInput = {
        name: draft.name.trim(),
        photoUrl: draft.photoUrl?.trim() || null,
        birthDate: draft.birthDate || null,
        gender: draft.gender || null,
        phone: draft.phone?.trim() || null,
        email: draft.email?.trim() || null,
        address: draft.address?.trim() || null,
        position: draft.position?.trim() || null,
        ordinationDate: draft.ordinationDate || null,
        faithLevel: draft.faithLevel?.trim() || null,
      };
      if (editing === 0 || editing === null) {
        const created = await onchurchChurchSaint.create(payload);
        await load();
        setEditing(created.id); // 새로 만든 성도는 편집 상태로 두어 바로 가족관계 추가 가능
        setDraft(payload);
      } else {
        await onchurchChurchSaint.update(editing, payload);
        await load();
        // 편집 완료 후 상세 보기로 복귀
        setDetailId(editing);
        setEditing(null);
      }
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  async function remove(s: ChurchSaint) {
    if (!confirm(`'${s.name}' 성도를 삭제할까요? 가족관계도 함께 삭제되며 되돌릴 수 없습니다.`)) return;
    setStatus("deleting");
    setErrMsg("");
    try {
      await onchurchChurchSaint.remove(s.id);
      if (editing === s.id) setEditing(null);
      if (detailId === s.id) setDetailId(null);
      setDraft(EMPTY_SAINT);
      await load();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
      setStatus("idle");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return saints;
    return saints.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? "").includes(q) ||
        (s.position ?? "").toLowerCase().includes(q),
    );
  }, [saints, query]);

  const editingSaint = editing && editing > 0 ? saints.find((s) => s.id === editing) ?? null : null;
  const detailSaint = detailId != null ? saints.find((s) => s.id === detailId) ?? null : null;
  const busy = status === "saving" || status === "deleting";

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">SAINTS</div>
        <h2>성도 명부</h2>
        <p>우리 교회 성도를 등록하고 관리합니다. 직분 · 신급 · 가족관계까지 한곳에서 관리할 수 있습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {detailSaint && editing === null ? (
          <SaintDetail
            saint={detailSaint}
            onEdit={() => startEdit(detailSaint)}
            onRemove={() => remove(detailSaint)}
            onBack={() => setDetailId(null)}
            onOpenSaint={(id) => { setDetailId(id); setEditing(null); setErrMsg(""); }}
            busy={busy}
          />
        ) : (
        <>
        {errMsg && editing === null && <div className="phone-msg phone-msg-error">{errMsg}</div>}

        {editing === null && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>총 {saints.length}명</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름·연락처·직분 검색"
              className="member-search"
              style={{ padding: "9px 14px", fontSize: 13, border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface)", fontFamily: "inherit" }}
            />
            <button type="button" className="btn btn-primary" onClick={startNew} disabled={editing !== null}>
              + 성도 추가
            </button>
          </div>
        </div>
        )}

        {editing !== null && (
          <div className="admin-banner-card editing">
            {errMsg && <div className="phone-msg phone-msg-error" style={{ marginBottom: 12 }}>{errMsg}</div>}
            <div className="form-grid">
              <div className="form-row">
                <label>이름 <span className="required-mark" aria-hidden="true">*</span></label>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="홍길동" required />
              </div>
              <div className="form-row">
                <label>성별</label>
                <select value={draft.gender ?? ""} onChange={(e) => setDraft({ ...draft, gender: (e.target.value || null) as SaintGender | null })}>
                  <option value="">선택 안 함</option>
                  <option value="male">남</option>
                  <option value="female">여</option>
                </select>
              </div>
              <div className="form-row">
                <label>생년월일</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.birthDate ?? ""}
                  onChange={(e) => setDraft({ ...draft, birthDate: formatDateInput(e.target.value) || null })}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                />
              </div>
              <div className="form-row">
                <label>연락처</label>
                <input
                  type="tel"
                  value={draft.phone ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone: formatPhone(e.target.value) })}
                  placeholder="010-1234-5678"
                />
              </div>
              <div className="form-row">
                <label>이메일</label>
                <input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="name@example.com" />
              </div>
              <div className="form-row">
                <label>직분</label>
                <select value={draft.position ?? ""} onChange={(e) => setDraft({ ...draft, position: e.target.value || null })}>
                  <option value="">선택 안 함</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>임직일</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.ordinationDate ?? ""}
                  onChange={(e) => setDraft({ ...draft, ordinationDate: formatDateInput(e.target.value) || null })}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                />
              </div>
              <div className="form-row">
                <label>신급</label>
                <select value={draft.faithLevel ?? ""} onChange={(e) => setDraft({ ...draft, faithLevel: e.target.value || null })}>
                  <option value="">선택 안 함</option>
                  {FAITH_LEVELS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="form-row full">
                <label>주소</label>
                <input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="서울특별시 강남구 ..." />
              </div>
              <PhotoUploadField value={draft.photoUrl} onChange={(url) => setDraft({ ...draft, photoUrl: url })} />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={cancel} disabled={status === "saving"}>닫기</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={status === "saving" || !draft.name.trim()}>
                {status === "saving" ? "저장 중..." : editingSaint ? "수정 저장" : "등록"}
              </button>
            </div>

            {editingSaint ? (
              <RelationsEditor saint={editingSaint} others={saints} />
            ) : (
              <p className="form-hint" style={{ fontSize: 12, marginTop: 8 }}>
                먼저 성도를 등록하면 가족관계를 추가할 수 있습니다.
              </p>
            )}
          </div>
        )}

        {editing === null && (status === "loading" ? (
          <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>{saints.length === 0 ? "아직 등록된 성도가 없습니다." : "검색 결과가 없습니다."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openDetail(s)}
                className="admin-banner-card"
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", background: "var(--surface)" }}
              >
                <SaintAvatar url={s.photoUrl} name={s.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 14 }}>{s.name}</strong>
                    {s.position && <span className="admin-sidebar-pill optional" style={{ fontSize: 10 }}>{s.position}</span>}
                    {s.faithLevel && <span style={{ color: "var(--muted)", fontSize: 12 }}>{s.faithLevel}</span>}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                    {[s.gender ? GENDER_LABEL[s.gender] : null, s.phone, s.birthDate].filter(Boolean).join(" · ") || "정보 없음"}
                  </div>
                </div>
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
