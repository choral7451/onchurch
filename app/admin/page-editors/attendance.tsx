"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  onchurchAttendance,
  onchurchChurchSaint,
  onchurchWorshipService,
  type AttendanceSession,
  type AttendanceStats,
  type ChurchSaint,
  type WorshipServiceItem,
} from "@/lib/api-client";

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

function cutoffStr(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mmdd(date: string): string {
  const [, m, d] = date.split("-");
  return m && d ? `${m}/${d}` : date;
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div style={{ flex: "1 1 130px", padding: "14px 16px", border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--surface)" }}>
      <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatsView() {
  const [weeks, setWeeks] = useState(4);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [saints, setSaints] = useState<ChurchSaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrMsg("");
      try {
        const [st, roster] = await Promise.all([onchurchAttendance.stats(weeks), onchurchChurchSaint.listMine()]);
        if (cancelled) return;
        setStats(st);
        setSaints(roster);
      } catch (err) {
        if (!cancelled) setErrMsg(err instanceof ApiError ? err.message : "통계를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weeks]);

  const view = useMemo(() => {
    if (!stats) return null;
    const total = saints.length;
    const trend = stats.trend;
    const latest = trend.length ? trend[trend.length - 1] : null;
    const prev = trend.length > 1 ? trend[trend.length - 2] : null;
    const delta = latest && prev ? latest.count - prev.count : null;

    const cutoff = cutoffStr(weeks);
    const windowTrend = trend.filter((t) => t.date >= cutoff);
    const avg = windowTrend.length
      ? Math.round(windowTrend.reduce((a, t) => a + t.count, 0) / windowTrend.length)
      : 0;

    const countMap = new Map(stats.perSaint.map((p) => [p.saintId, p.count]));
    const absentees = saints
      .filter((s) => !countMap.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    const perSaint = saints
      .map((s) => ({ saint: s, count: countMap.get(s.id) ?? 0 }))
      .sort((a, b) => a.count - b.count || a.saint.name.localeCompare(b.saint.name, "ko"));
    const byService = stats.byService.map((s) => ({
      ...s,
      avg: s.occurrences ? Math.round(s.total / s.occurrences) : 0,
    }));

    return { total, trend, latest, delta, avg, windowDates: stats.windowDates, absentees, perSaint, byService };
  }, [stats, saints, weeks]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="chips">
        {[4, 8, 12].map((w) => (
          <div key={w} className={`chip ${weeks === w ? "active" : ""}`} onClick={() => setWeeks(w)}>최근 {w}주</div>
        ))}
      </div>

      {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
      {loading || !view ? (
        <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
      ) : (
        <>
          {/* 1. 요약 카드 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SummaryCard
              label="최근 예배 출석"
              value={`${view.latest?.count ?? 0}명`}
              sub={
                <span>
                  {view.latest ? view.latest.date : "기록 없음"}
                  {view.delta !== null && view.delta !== 0 && (
                    <span style={{ color: view.delta > 0 ? "var(--primary)" : "oklch(0.6 0.18 28)", marginLeft: 6, fontWeight: 700 }}>
                      {view.delta > 0 ? `▲${view.delta}` : `▼${Math.abs(view.delta)}`}
                    </span>
                  )}
                </span>
              }
            />
            <SummaryCard
              label="출석률"
              value={view.total ? `${Math.round(((view.latest?.count ?? 0) / view.total) * 100)}%` : "—"}
              sub={<span style={{ color: "var(--muted)" }}>전체 {view.total}명 기준</span>}
            />
            <SummaryCard label={`최근 ${weeks}주 평균`} value={`${view.avg}명`} sub={<span style={{ color: "var(--muted)" }}>예배 {view.windowDates}회</span>} />
            <SummaryCard label="장기 결석" value={`${view.absentees.length}명`} sub={<span style={{ color: "var(--muted)" }}>{weeks}주간 무출석</span>} />
          </div>

          {/* 3. 주별 출석 추이 */}
          <div>
            <h3 style={{ fontSize: 15, margin: "0 0 10px" }}>출석 추이</h3>
            {view.trend.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>출석 기록이 없습니다.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, overflowX: "auto", padding: "8px 4px", minHeight: 140 }}>
                {(() => {
                  const max = Math.max(1, ...view.trend.map((t) => t.count));
                  return view.trend.map((t, i) => (
                    <div key={`${t.date}-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 34 }}>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{t.count}</span>
                      <div
                        title={`${t.date} · ${t.count}명`}
                        style={{ width: 22, height: Math.round((t.count / max) * 96) + 4, background: "var(--primary)", borderRadius: "6px 6px 0 0" }}
                      />
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{mmdd(t.date)}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* 4. 예배별 출석 */}
          <div>
            <h3 style={{ fontSize: 15, margin: "0 0 10px" }}>예배별 출석 (최근 {weeks}주)</h3>
            {view.byService.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>기록이 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {view.byService.map((s) => (
                  <div key={s.serviceType} className="admin-banner-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <strong style={{ fontSize: 14 }}>{s.serviceType}</strong>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>
                      평균 <b style={{ color: "var(--ink)" }}>{s.avg}명</b> · {s.occurrences}회 · 누적 {s.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. 장기 결석자 */}
          <div>
            <h3 style={{ fontSize: 15, margin: "0 0 10px" }}>장기 결석자 <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>· 최근 {weeks}주 한 번도 출석 안 함</span></h3>
            {view.absentees.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>없습니다. 👏</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {view.absentees.map((s) => (
                  <div key={s.id} className="admin-banner-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar url={s.photoUrl} name={s.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 14 }}>{s.name}</strong>
                        {s.position && <span className="admin-sidebar-pill optional" style={{ fontSize: 10 }}>{s.position}</span>}
                      </div>
                      {s.phone && <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{s.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. 성도별 출석률 */}
          <div>
            <h3 style={{ fontSize: 15, margin: "0 0 10px" }}>성도별 출석 <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>· 최근 {weeks}주 (예배 {view.windowDates}회 기준)</span></h3>
            {view.perSaint.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>성도 명부가 비어 있습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {view.perSaint.map(({ saint, count }) => {
                  const rate = view.windowDates ? Math.round((count / view.windowDates) * 100) : 0;
                  const full = view.windowDates > 0 && count === view.windowDates;
                  return (
                    <div key={saint.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
                      <strong style={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>
                        {saint.name}
                        {saint.position && <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{saint.position}</span>}
                      </strong>
                      {full && <span className="admin-sidebar-pill complete" style={{ fontSize: 10 }}>개근</span>}
                      <span style={{ fontSize: 13, color: count === 0 ? "oklch(0.6 0.18 28)" : "var(--muted)" }}>
                        {count}/{view.windowDates}회 · {rate}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AttendanceEditor() {
  const [view, setView] = useState<"check" | "stats" | "history">("check");
  const [date, setDate] = useState(todayStr());
  const [serviceType, setServiceType] = useState("");

  const [saints, setSaints] = useState<ChurchSaint[]>([]);
  const [services, setServices] = useState<WorshipServiceItem[]>([]);
  const [present, setPresent] = useState<Set<number>>(new Set());
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("");

  // 명단 + 예배안내(예배 종류) 로드 — 예배 종류는 홈페이지 예배안내에서 가져온다
  useEffect(() => {
    (async () => {
      setLoadingRoster(true);
      setErrMsg("");
      try {
        const [roster, svcs] = await Promise.all([
          onchurchChurchSaint.listMine(),
          onchurchWorshipService.listMine(),
        ]);
        setSaints(roster);
        const active = svcs.filter((s) => s.isActive);
        setServices(active);
        setServiceType((prev) => prev || active[0]?.name || "");
      } catch (err) {
        setErrMsg(err instanceof ApiError ? err.message : "성도 명부를 불러오지 못했습니다.");
      } finally {
        setLoadingRoster(false);
      }
    })();
  }, []);

  // 날짜/예배가 바뀌면 해당 세션 출석 현황 로드
  useEffect(() => {
    if (view !== "check" || !serviceType) return;
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
    return saints
      .filter((s) => {
        if (posFilter && s.position !== posFilter) return false;
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || (s.phone ?? "").includes(q);
      })
      // 즐겨찾기 먼저, 각 그룹 안에서는 이름 가나다순.
      .sort((a, b) => {
        if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
        return a.name.localeCompare(b.name, "ko");
      });
  }, [saints, query, posFilter]);

  async function toggleFavorite(saint: ChurchSaint) {
    const next = !saint.isFavorite;
    // 낙관적 업데이트
    setSaints((prev) => prev.map((s) => (s.id === saint.id ? { ...s, isFavorite: next } : s)));
    try {
      await onchurchChurchSaint.updateFavorite(saint.id, next);
    } catch (err) {
      setSaints((prev) => prev.map((s) => (s.id === saint.id ? { ...s, isFavorite: !next } : s)));
      setErrMsg(err instanceof ApiError ? err.message : "즐겨찾기 저장에 실패했습니다.");
    }
  }

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
          <div className={`chip ${view === "stats" ? "active" : ""}`} onClick={() => setView("stats")}>통계</div>
          <div className={`chip ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}>출석 이력</div>
        </div>

        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}

        {view === "stats" ? (
          <StatsView />
        ) : view === "history" ? (
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
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} disabled={services.length === 0}>
                  {services.length === 0 ? (
                    <option value="">예배안내에 예배가 없습니다</option>
                  ) : (
                    services.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}{s.time ? ` · ${s.time}` : ""}
                      </option>
                    ))
                  )}
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
                <button type="button" className="btn btn-secondary" onClick={() => setAll(true)} disabled={loadingSession || !serviceType}>전체 출석</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAll(false)} disabled={loadingSession || !serviceType}>전체 해제</button>
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
            ) : services.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>홈페이지 <b>예배안내</b>에 예배를 먼저 등록해주세요. 등록된 예배가 출석 예배 종류로 표시됩니다.</p>
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
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={s.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
                        aria-pressed={s.isFavorite}
                        onClick={(e) => { e.stopPropagation(); void toggleFavorite(s); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); void toggleFavorite(s); } }}
                        style={{
                          flexShrink: 0,
                          fontSize: 18,
                          lineHeight: 1,
                          cursor: "pointer",
                          color: s.isFavorite ? "oklch(0.78 0.16 85)" : "var(--muted-2)",
                          userSelect: "none",
                        }}
                      >
                        {s.isFavorite ? "★" : "☆"}
                      </span>
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
