"use client";

import { useState } from "react";
import type { HistoryItem, Pastor, StaffMember, VisionItem } from "@/lib/types";

const TABS = [
  { id: "greeting", label: "담임목사 인사" },
  { id: "vision", label: "비전과 사명" },
  { id: "history", label: "교회 연혁" },
  { id: "staff", label: "교역자 소개" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  pastor: Pastor;
  vision: VisionItem[];
  history: HistoryItem[];
  staff: StaffMember[];
};

export function AboutTabs({ pastor, vision, history, staff }: Props) {
  const [tab, setTab] = useState<TabId>("greeting");

  return (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <div key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === "greeting" && (
        <div className="pastor-section">
          <div className="pastor-photo"><div className="pastor-photo-label">담임목사 사진</div></div>
          <div className="pastor-block">
            <span className="eyebrow">Greetings</span>
            <h2 className="pastor-name">{pastor.name} <span>{pastor.role} / {pastor.eng}</span></h2>
            <p className="pastor-msg">
              {pastor.longMessage.split("\n\n").map((para, i, arr) => (
                <span key={i}>{para}{i < arr.length - 1 && <><br /><br /></>}</span>
              ))}
            </p>
            <div className="pastor-sign">담임목사 <strong>{pastor.name}</strong></div>
          </div>
        </div>
      )}

      {tab === "vision" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {vision.map((v) => (
            <div key={v.en} className="card">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", color: "var(--accent)" }}>{v.en}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--primary-deep)", margin: "12px 0 14px" }}>{v.ko}</div>
              <p style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, lineHeight: 1.7 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 6, top: 12, bottom: 12, width: 2, background: "var(--line)" }} />
          {history.map((e) => (
            <div key={e.y} style={{ position: "relative", padding: "18px 0 18px 32px" }}>
              <div style={{ position: "absolute", left: -3, top: 24, width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", border: "3px solid var(--bg)" }} />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.05em" }}>{e.y}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--primary-deep)", margin: "4px 0 6px", letterSpacing: "-0.02em" }}>{e.t}</div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>{e.d}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "staff" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {staff.map((s) => (
            <div key={s.name} className="card card-hover" style={{ textAlign: "center", padding: 24 }}>
              <div style={{ width: 96, height: 96, margin: "0 auto 16px", borderRadius: "50%", background: "repeating-linear-gradient(45deg, oklch(0.94 0.01 245) 0 6px, oklch(0.92 0.012 245) 6px 12px)", display: "grid", placeItems: "center", border: "1px solid var(--line)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>PHOTO</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--primary-deep)" }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, margin: "4px 0", letterSpacing: "0.05em" }}>{s.role}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{s.area}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
