"use client";

import { useEffect, useState } from "react";
import { ApiError, onchurchPrayer, type PrayerItem, type PrayerStatus } from "@/lib/api-client";

type Status = "idle" | "loading" | "saving" | "deleting";
type Filter = "all" | PrayerStatus;

const STATUS_LABEL: Record<PrayerStatus, string> = {
  pending: "미확인",
  praying: "기도 중",
  answered: "응답",
};

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "미확인" },
  { key: "praying", label: "기도 중" },
  { key: "answered", label: "응답" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function PrayerEditor() {
  const [items, setItems] = useState<PrayerItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchPrayer.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "기도 요청을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  async function changeStatus(id: number, next: PrayerStatus) {
    setStatus("saving"); setErrMsg("");
    try {
      const updated = await onchurchPrayer.updateStatus(id, next);
      setItems((cur) => cur.map((it) => (it.id === id ? updated : it)));
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "상태 변경에 실패했습니다.");
    } finally { setStatus("idle"); }
  }

  async function remove(id: number) {
    if (!confirm("이 기도 요청을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setStatus("deleting"); setErrMsg("");
    try {
      await onchurchPrayer.remove(id);
      setItems((cur) => cur.filter((it) => it.id !== id));
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    } finally { setStatus("idle"); }
  }

  const visible = filter === "all" ? items : items.filter((it) => it.status === filter);
  const countByStatus = (s: PrayerStatus) => items.filter((it) => it.status === s).length;

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">PRAYER REQUESTS</div>
        <h2>기도 요청 받은 목록</h2>
        <p>공개 페이지에서 보내온 기도 제목입니다. 익명 요청은 이름·연락처가 표시되지 않습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}

        <div className="chips" style={{ flexWrap: "wrap", gap: 6 }}>
          {FILTER_TABS.map((t) => {
            const count = t.key === "all" ? items.length : countByStatus(t.key);
            return (
              <button
                type="button"
                key={t.key}
                className={`chip ${filter === t.key ? "active" : ""}`}
                onClick={() => setFilter(t.key)}
              >
                {t.label}
                <span style={{ marginLeft: 6, fontVariantNumeric: "tabular-nums", opacity: 0.7 }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
          {status !== "loading" && visible.length === 0 && (
            <p style={{ color: "var(--muted)" }}>
              {filter === "all" ? "아직 받은 기도 요청이 없습니다." : "해당 상태의 기도 요청이 없습니다."}
            </p>
          )}
          {visible.map((it) => {
            const isOpen = expandedId === it.id;
            const displayName = it.isAnonymous ? "익명" : (it.name?.trim() || "이름 없음");
            return (
              <div key={it.id} className="admin-banner-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong>{displayName}</strong>
                  {it.isAnonymous && (
                    <span className="admin-sidebar-pill optional" style={{ fontSize: 10 }}>익명</span>
                  )}
                  <span className="admin-sidebar-pill complete" style={{ fontSize: 10 }}>{it.category}</span>
                  <span className="admin-sidebar-pill optional" style={{ fontSize: 10 }}>{it.scope}</span>
                  <span
                    className={`admin-sidebar-pill ${it.status === "answered" ? "complete" : it.status === "praying" ? "complete" : "optional"}`}
                    style={{ fontSize: 10 }}
                  >
                    {STATUS_LABEL[it.status]}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: "auto" }}>{formatDate(it.createdAt)}</span>
                </div>

                {!it.isAnonymous && it.contact && (
                  <div style={{ color: "var(--muted)", fontSize: 12.5 }}>연락처: {it.contact}</div>
                )}

                <div
                  style={{
                    color: "var(--ink)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: "pre-line",
                    maxHeight: isOpen ? "none" : 80,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {it.content}
                </div>
                {!isOpen && it.content.length > 100 && (
                  <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => setExpandedId(it.id)}>
                    전문 보기
                  </button>
                )}
                {isOpen && (
                  <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => setExpandedId(null)}>
                    접기
                  </button>
                )}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
                    상태
                    <select
                      value={it.status}
                      onChange={(e) => void changeStatus(it.id, e.target.value as PrayerStatus)}
                      disabled={status === "saving"}
                    >
                      <option value="pending">미확인</option>
                      <option value="praying">기도 중</option>
                      <option value="answered">응답</option>
                    </select>
                  </label>
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void remove(it.id)}
                    disabled={status === "deleting"}
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
