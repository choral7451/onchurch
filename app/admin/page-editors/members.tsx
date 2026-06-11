"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, onchurchChurchMember, type ChurchMember } from "@/lib/api-client";

type Status = "idle" | "loading" | "deleting" | "updating";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  owner: { label: "오너", bg: "#fbeec1", color: "#8a6d00" },
  admin: { label: "관리자", bg: "#dce8ff", color: "#1f49a6" },
  member: { label: "맴버", bg: "var(--surface)", color: "var(--muted)" },
};

function RoleBadge({ role }: { role: string }) {
  const b = ROLE_BADGE[role] ?? ROLE_BADGE.member;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: b.bg, color: b.color, border: "1px solid var(--line)" }}>
      {b.label}
    </span>
  );
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

  async function changeRole(m: ChurchMember, role: "admin" | "member") {
    const label = role === "admin" ? "관리자로 승급" : "맴버로 강등";
    if (!confirm(`'${m.name}'(${m.loginId}) 회원을 ${label}할까요?${role === "admin" ? " 관리자는 관리자페이지에서 교회를 관리할 수 있습니다." : ""}`)) return;
    setStatus("updating"); setErrMsg("");
    try { await onchurchChurchMember.changeRole(m.id, role); await load(); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "등급 변경에 실패했습니다."); setStatus("idle"); }
  }

  const busy = status === "deleting" || status === "updating";

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
        <p>우리 교회 홈페이지에서 가입한 성도(회원) 목록입니다. 회원을 <b>관리자</b>로 올리면 관리자페이지에 접근해 함께 교회를 관리할 수 있습니다. <b>오너</b> 등급은 변경할 수 없습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>총 {members.length}명</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·아이디·연락처 검색"
            className="member-search"
            style={{ padding: "9px 14px", fontSize: 13, border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface)", fontFamily: "inherit" }}
          />
        </div>

        {status === "loading" ? (
          <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>{members.length === 0 ? "아직 가입한 회원이 없습니다." : "검색 결과가 없습니다."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((m) => (
              <div key={m.id} className="admin-banner-card member-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <RoleBadge role={m.churchRole} />
                    <strong style={{ fontSize: 14 }}>{m.name}</strong>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>@{m.loginId}</span>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                    {m.phone || "연락처 없음"} · 가입 {formatDate(m.createdAt)}
                  </div>
                </div>
                {m.churchRole === "owner" ? (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>교회 오너</span>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {m.churchRole === "admin" ? (
                      <button type="button" className="btn btn-ghost" onClick={() => changeRole(m, "member")} disabled={busy}>맴버로 강등</button>
                    ) : (
                      <button type="button" className="btn btn-ghost" onClick={() => changeRole(m, "admin")} disabled={busy}>관리자로 승급</button>
                    )}
                    <button type="button" className="btn btn-ghost" onClick={() => remove(m)} disabled={busy}>삭제</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
