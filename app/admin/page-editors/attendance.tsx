"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  onchurchAttendance,
  onchurchChurchSaint,
  type AttendanceSession,
  type ChurchSaint,
} from "@/lib/api-client";

const SERVICE_TYPES = ["주일오전예배", "주일오후예배", "수요예배", "새벽기도회", "금요기도회"];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
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
        <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: 700 }}>{name.slice(0, 1)}</span>
      )}
    </div>
  );
}

function HistoryView() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrMsg("");
      try {
        setSessions(await onchurchAttendance.listSessions());
      } catch (err) {
        setErrMsg(err instanceof ApiError ? err.message : "출석 이력을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;
  if (errMsg) return <div className="phone-msg phone-msg-error">{errMsg}</div>;
  if (sessions.length === 0) return <p style={{ color: "var(--muted)" }}>아직 출석 기록이 없습니다.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sessions.map((s, i) => (
        <div
          key={`${s.date}-${s.serviceType}-${i}`}
          className="admin-banner-card"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{s.date}</strong>
            <span className="admin-sidebar-pill optional" style={{ fontSize: 11 }}>{s.serviceType}</span>
          </div>
          <strong style={{ fontSize: 15, color: "var(--primary)" }}>{s.count}명</strong>
        </div>
      ))}
    </div>
  );
}

export function AttendanceEditor() {
  const [view, setView] = useState<"check" | "history">("check");
  const [date, setDate] = useState(todayStr());
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);

  const [saints, setSaints] = useState<ChurchSaint[]>([]);
  const [present, setPresent] = useState<Set<number>>(new Set());
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("");

  // 명단은 한 번만 로드
  useEffect(() => {
    (async () => {
      setLoadingRoster(true);
      setErrMsg("");
      try {
        setSaints(await onchurchChurchSaint.listMine());
      } catch (err) {
        setErrMsg(err instanceof ApiError ? err.message : "성도 명부를 불러오지 못했습니다.");
      } finally {
        setLoadingRoster(false);
      }
    })();
  }, []);

  // 날짜/예배가 바뀌면 해당 세션 출석 현황 로드
  useEffect(() => {
    if (view !== "check") return;
    let cancelled = false;
    (async () => {
      setLoadingSession(true);
      setErrMsg("");
      try {
        const ids = await onchurchAttendance.getSession(date, serviceType);
        if (!cancelled) setPresent(new Set(ids));
      } catch (err) {
        if (!cancelled) setErrMsg(err instanceof ApiError ? err.message : "출석 현황을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, serviceType, view]);

  async function toggle(saint: ChurchSaint) {
    const next = !present.has(saint.id);
    // 낙관적 업데이트
    setPresent((prev) => {
      const s = new Set(prev);
      if (next) s.add(saint.id);
      else s.delete(saint.id);
      return s;
    });
    try {
      await onchurchAttendance.mark(date, serviceType, saint.id, next);
    } catch (err) {
      // 롤백
      setPresent((prev) => {
        const s = new Set(prev);
        if (next) s.delete(saint.id);
        else s.add(saint.id);
        return s;
      });
      setErrMsg(err instanceof ApiError ? err.message : "출석 저장에 실패했습니다.");
    }
  }

  const positions = useMemo(() => {
    const set = new Set<string>();
    saints.forEach((s) => s.position && set.add(s.position));
    return Array.from(set);
  }, [saints]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return saints.filter((s) => {
      if (posFilter && s.position !== posFilter) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || (s.phone ?? "").includes(q);
    });
  }, [saints, query, posFilter]);

  async function setAll(targetPresent: boolean) {
    const changed = filtered.filter((s) => present.has(s.id) !== targetPresent);
    if (changed.length === 0) return;
    if (targetPresent && changed.length > 30 && !confirm(`${changed.length}명을 모두 출석 처리할까요?`)) return;
    // 낙관적 업데이트
    setPresent((prev) => {
      const s = new Set(prev);
      changed.forEach((c) => (targetPresent ? s.add(c.id) : s.delete(c.id)));
      return s;
    });
    setErrMsg("");
    try {
      await Promise.all(changed.map((c) => onchurchAttendance.mark(date, serviceType, c.id, targetPresent)));
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "일괄 처리 중 일부가 실패했습니다. 새로고침 해주세요.");
      // 안전하게 서버 상태 재로딩
      try {
        setPresent(new Set(await onchurchAttendance.getSession(date, serviceType)));
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">ATTENDANCE</div>
        <h2>출석체크</h2>
        <p>날짜와 예배를 고른 뒤 이름을 눌러 출석을 체크하세요. 누르는 즉시 자동 저장됩니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="chips">
          <div className={`chip ${view === "check" ? "active" : ""}`} onClick={() => setView("check")}>출석체크</div>
          <div className={`chip ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}>출석 이력</div>
        </div>

        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}

        {view === "history" ? (
          <HistoryView />
        ) : (
          <>
            <div className="form-grid">
              <div className="form-row">
                <label>날짜</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayStr())} />
              </div>
              <div className="form-row">
                <label>예배</label>
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                  {SERVICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                padding: "10px 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
              }}
            >
              <strong style={{ fontSize: 15 }}>
                출석 <span style={{ color: "var(--primary)" }}>{present.size}</span> / 전체 {saints.length}명
              </strong>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAll(true)} disabled={loadingSession}>전체 출석</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAll(false)} disabled={loadingSession}>전체 해제</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름·연락처 검색"
                className="member-search"
                style={{ flex: "1 1 180px", padding: "9px 14px", fontSize: 13, border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface)", fontFamily: "inherit" }}
              />
              {positions.length > 0 && (
                <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)} style={{ flex: "0 0 140px" }}>
                  <option value="">직분 전체</option>
                  {positions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              )}
            </div>

            {loadingRoster ? (
              <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
            ) : saints.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>먼저 성도 명부에 성도를 등록해주세요.</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>검색 결과가 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filtered.map((s) => {
                  const on = present.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        borderRadius: "var(--r-md)",
                        border: `1px solid ${on ? "var(--primary)" : "var(--line)"}`,
                        background: on ? "color-mix(in oklch, var(--primary) 10%, var(--surface))" : "var(--surface)",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        fontFamily: "inherit",
                        transition: "all 0.12s ease",
                      }}
                    >
                      <Avatar url={s.photoUrl} name={s.name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 14 }}>{s.name}</strong>
                          {s.position && <span style={{ color: "var(--muted)", fontSize: 12 }}>{s.position}</span>}
                        </div>
                      </div>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          background: on ? "var(--primary)" : "transparent",
                          border: `1.5px solid ${on ? "var(--primary)" : "var(--muted-2)"}`,
                          color: "#fff",
                          fontSize: 15,
                          fontWeight: 700,
                        }}
                      >
                        {on ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
