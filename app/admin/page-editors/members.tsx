"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, onchurchChurchMember, type ChurchMember } from "@/lib/api-client";

type Status = "idle" | "loading" | "deleting";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function MembersEditor() {
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setMembers(await onchurchChurchMember.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "회원 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  async function remove(m: ChurchMember) {
    if (!confirm(`'${m.name}'(${m.loginId}) 회원을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setStatus("deleting"); setErrMsg("");
    try { await onchurchChurchMember.remove(m.id); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다."); setStatus("idle"); }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.loginId.toLowerCase().includes(q) || (m.phone ?? "").includes(q));
  }, [members, query]);

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">MEMBERS</div>
        <h2>회원 관리</h2>
        <p>우리 교회 홈페이지에서 가입한 성도(회원) 목록입니다. 교제 게시판에 글을 쓸 수 있는 사람들입니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>총 {members.length}명</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·아이디·연락처 검색"
            style={{ padding: "9px 14px", fontSize: 13, border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface)", width: 240, fontFamily: "inherit" }}
          />
        </div>

        {status === "loading" ? (
          <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>{members.length === 0 ? "아직 가입한 회원이 없습니다." : "검색 결과가 없습니다."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((m) => (
              <div key={m.id} className="admin-banner-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 14 }}>{m.name}</strong>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>@{m.loginId}</span>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                    {m.phone || "연락처 없음"} · 가입 {formatDate(m.createdAt)}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => remove(m)} disabled={status === "deleting"}>삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
