"use client";

import { useState } from "react";

type Pastor = {
  id: number;
  name: string;
  role: string | null;
  eng: string | null;
  message: string | null;
  longMessage: string | null;
  photoUrl: string | null;
};

type VisionItem = {
  id: number;
  ko: string;
  en: string | null;
  description: string | null;
};

type HistoryItem = {
  id: number;
  year: string;
  title: string;
  description: string | null;
};

type StaffMember = {
  id: number;
  name: string;
  role: string | null;
  area: string | null;
  photoUrl: string | null;
};

const TABS = [
  { id: "greeting", label: "담임목사 인사" },
  { id: "vision", label: "비전과 사명" },
  { id: "history", label: "교회 연혁" },
  { id: "staff", label: "교역자 소개" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  pastor: Pastor | null;
  vision: VisionItem[];
  history: HistoryItem[];
  staff: StaffMember[];
  enabledPages?: string[];
};

export function AboutTabs({ pastor, vision, history, staff, enabledPages }: Props) {
  const enabled = enabledPages ?? [];
  const isOn = (key: string) => enabled.length === 0 || enabled.includes(key);
  const visibleTabs = TABS.filter((t) => {
    if (t.id === "greeting") return true;
    return isOn(`about-${t.id}`);
  });
  const [tab, setTab] = useState<TabId>("greeting");
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : "greeting";

  return (
    <>
      <div className="tabs">
        {visibleTabs.map((t) => (
          <div key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {activeTab === "greeting" && (
        pastor ? (
          <div className="pastor-section">
            <div className="pastor-photo">
              {pastor.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pastor.photoUrl} alt={pastor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div className="pastor-photo-label">담임목사 사진</div>
              )}
            </div>
            <div className="pastor-block">
              <span className="eyebrow">Greetings</span>
              <h2 className="pastor-name">
                {pastor.name}{" "}
                <span>
                  {pastor.role}{pastor.role && pastor.eng ? " / " : ""}{pastor.eng}
                </span>
              </h2>
              <p className="pastor-msg">
                {(pastor.longMessage ?? pastor.message ?? "").split("\n\n").map((para, i, arr) => (
                  <span key={i}>
                    {para}
                    {i < arr.length - 1 && <><br /><br /></>}
                  </span>
                ))}
              </p>
              <div className="pastor-sign">{pastor.role ?? "담임목사"} <strong>{pastor.name}</strong></div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>아직 담임목사 인사말이 등록되지 않았습니다.</div>
        )
      )}

      {activeTab === "vision" && (
        vision.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>아직 비전이 등록되지 않았습니다.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {vision.map((v) => (
              <div key={v.id} className="card">
                {v.en && <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", color: "var(--accent)" }}>{v.en}</div>}
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--primary-deep)", margin: "12px 0 14px" }}>{v.ko}</div>
                {v.description && <p style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, lineHeight: 1.7 }}>{v.description}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "history" && (
        history.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>아직 교회 연혁이 등록되지 않았습니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 6, top: 12, bottom: 12, width: 2, background: "var(--line)" }} />
            {history.map((e) => (
              <div key={e.id} style={{ position: "relative", padding: "18px 0 18px 32px" }}>
                <div style={{ position: "absolute", left: -3, top: 24, width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", border: "3px solid var(--bg)" }} />
                <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.05em" }}>{e.year}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--primary-deep)", margin: "4px 0 6px", letterSpacing: "-0.02em" }}>{e.title}</div>
                {e.description && <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "staff" && (
        staff.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>아직 교역자 정보가 등록되지 않았습니다.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {staff.map((s) => (
              <div key={s.id} className="card card-hover" style={{ textAlign: "center", padding: 24 }}>
                <div style={{ width: 96, height: 96, margin: "0 auto 16px", borderRadius: "50%", background: s.photoUrl ? `center/cover no-repeat url("${s.photoUrl}")` : "repeating-linear-gradient(45deg, oklch(0.94 0.01 245) 0 6px, oklch(0.92 0.012 245) 6px 12px)", display: "grid", placeItems: "center", border: "1px solid var(--line)" }}>
                  {!s.photoUrl && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>PHOTO</span>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--primary-deep)" }}>{s.name}</div>
                {s.role && <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, margin: "4px 0", letterSpacing: "0.05em" }}>{s.role}</div>}
                {s.area && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{s.area}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}
