"use client";

// 시작하기(온보딩) 아코디언 전용 — '딱 기본 필수값'만 그 자리에서 입력/저장한다.
// 교회 소개·예배 안내는 별도 API라, 풀 에디터 대신 필수값만 다루는 미니 폼을 둔다.

import { useEffect, useState } from "react";
import {
  ApiError,
  onchurchPastor,
  onchurchWorshipService,
  type PastorWriteInput,
  type WorshipServiceTag,
} from "@/lib/api-client";

type Status = "loading" | "idle" | "saving";

// 교회 소개 필수값 = 담임목사 성함
export function OnboardPastorName({ onChanged }: { onChanged?: () => void }) {
  const [name, setName] = useState("");
  const [existing, setExisting] = useState<PastorWriteInput | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading");
    try {
      const res = await onchurchPastor.getMine();
      const p = res.pastor;
      if (p) {
        setName(p.name ?? "");
        setExisting({ name: p.name, role: p.role, eng: p.eng, message: p.message, longMessage: p.longMessage, photoUrl: p.photoUrl });
      }
    } catch {
      /* 조회 실패 시 빈 폼 */
    } finally {
      setStatus("idle");
    }
  }

  async function save() {
    if (!name.trim()) { setErr("담임목사 성함을 입력해주세요."); return; }
    setStatus("saving"); setErr(""); setMsg("");
    try {
      await onchurchPastor.upsertMine({ ...(existing ?? {}), name: name.trim() });
      setMsg("저장되었습니다."); onChanged?.();
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "저장에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="form-row full">
      <label htmlFor="ob-pastor">
        담임목사 성함 <span className="required-mark" aria-hidden="true">*</span>
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          id="ob-pastor"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={status === "loading" ? "불러오는 중..." : "홍길동"}
          disabled={status === "loading"}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-primary" onClick={save} disabled={status !== "idle" || !name.trim()}>
          {status === "saving" ? "저장 중..." : "저장"}
        </button>
      </div>
      <p className="form-hint">교회 소개 페이지에서 인사말·사진 등 나머지는 나중에 추가할 수 있습니다.</p>
      {msg && <span className="phone-msg phone-msg-success">{msg}</span>}
      {err && <span className="phone-msg phone-msg-error">{err}</span>}
    </div>
  );
}

// 예배 안내 필수값 = 예배 시간표 1개 이상
export function OnboardFirstWorship({ onChanged }: { onChanged?: () => void }) {
  const [count, setCount] = useState(0);
  const [tag, setTag] = useState<WorshipServiceTag>("WEEK");
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading");
    try { setCount((await onchurchWorshipService.listMine()).length); }
    catch { /* 무시 */ }
    finally { setStatus("idle"); }
  }

  async function add() {
    if (!name.trim() || !time.trim()) { setErr("예배 이름과 시간을 입력해주세요."); return; }
    setStatus("saving"); setErr(""); setMsg("");
    try {
      await onchurchWorshipService.create({
        tag, name: name.trim(), time: time.trim(), meta: null, isFeatured: false, sortOrder: count, isActive: true,
      });
      setName(""); setTime("");
      await load();
      setMsg("저장되었습니다."); onChanged?.();
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "추가에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {count > 0 && (
        <p className="form-hint" style={{ color: "oklch(0.38 0.16 145)" }}>
          ✓ 예배 {count}개 등록됨 — 더 추가하거나 예배 안내 페이지에서 관리할 수 있습니다.
        </p>
      )}
      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="ob-w-tag">구분 <span className="required-mark" aria-hidden="true">*</span></label>
          <select id="ob-w-tag" value={tag} onChange={(e) => setTag(e.target.value as WorshipServiceTag)}>
            <option value="WEEK">주일·주중</option>
            <option value="DAILY">매일</option>
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="ob-w-name">예배 이름 <span className="required-mark" aria-hidden="true">*</span></label>
          <input id="ob-w-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="주일 1부 예배" />
        </div>
        <div className="form-row">
          <label htmlFor="ob-w-time">시간 <span className="required-mark" aria-hidden="true">*</span></label>
          <input id="ob-w-time" type="text" value={time} onChange={(e) => setTime(e.target.value)} placeholder="오전 09:00" />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={add} disabled={status !== "idle" || !name.trim() || !time.trim()}>
          {status === "saving" ? "저장 중..." : "저장"}
        </button>
      </div>
      {msg && <span className="phone-msg phone-msg-success">{msg}</span>}
      {err && <span className="phone-msg phone-msg-error">{err}</span>}
    </div>
  );
}
