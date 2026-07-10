"use client";

import { useState } from "react";
import { type Lang, pick } from "@/lib/i18n";

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
  phone: string | null;
  email: string | null;
};

const TABS = [
  { id: "greeting", label: { ko: "담임목사 인사", en: "Pastor's Greeting" } },
  { id: "vision", label: { ko: "비전과 사명", en: "Vision & Mission" } },
  { id: "history", label: { ko: "교회 연혁", en: "History" } },
  { id: "staff", label: { ko: "섬김의 사람들", en: "Our Team" } },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  pastor: Pastor | null;
  vision: VisionItem[];
  history: HistoryItem[];
  staff: StaffMember[];
  enabledPages?: string[];
  lang?: Lang;
};

export function AboutTabs({ pastor, vision, history, staff, enabledPages, lang = "ko" }: Props) {
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
            {pick(lang, t.label)}
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
                <div className="pastor-photo-label">{pick(lang, { ko: "담임목사 사진", en: "Pastor photo" })}</div>
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
              <div className="pastor-sign">{pastor.role ?? pick(lang, { ko: "담임목사", en: "Senior Pastor" })} <strong>{pastor.name}</strong></div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>{pick(lang, { ko: "아직 담임목사 인사말이 등록되지 않았습니다.", en: "No pastor's greeting yet." })}</div>
        )
      )}

      {activeTab === "vision" && (
        vision.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>{pick(lang, { ko: "아직 비전이 등록되지 않았습니다.", en: "No vision yet." })}</div>
        ) : (
          <div className="vision-grid">
            {vision.map((v) => (
              <div key={v.id} className="card vision-card">
                {v.en && <div className="vision-en">{v.en}</div>}
                <div className="vision-ko">{v.ko}</div>
                {v.description && <p className="vision-desc">{v.description}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "history" && (
        history.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>{pick(lang, { ko: "아직 교회 연혁이 등록되지 않았습니다.", en: "No history yet." })}</div>
        ) : (
          <div className="history-timeline">
            <div className="history-rail" />
            {history.map((e) => (
              <div key={e.id} className="history-item">
                <div className="history-dot" />
                <div className="history-year">{e.year}</div>
                <div className="history-title">{e.title}</div>
                {e.description && <p className="history-desc">{e.description}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "staff" && (
        staff.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>{pick(lang, { ko: "아직 섬김의 사람들 정보가 등록되지 않았습니다.", en: "No team members yet." })}</div>
        ) : (
          <div className="staff-grid">
            {staff.map((s) => (
              <div key={s.id} className="card card-hover staff-card">
                <div
                  className="staff-photo"
                  style={s.photoUrl ? { background: `center/cover no-repeat url("${s.photoUrl}")` } : undefined}
                >
                  {!s.photoUrl && <span className="staff-photo-label">PHOTO</span>}
                </div>
                <div className="staff-name">{s.name}</div>
                {s.role && <div className="staff-role">{s.role}</div>}
                {s.area && <div className="staff-area">{s.area}</div>}
                {s.phone && <div className="staff-contact">{s.phone}</div>}
                {s.email && <div className="staff-contact">{s.email}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}
