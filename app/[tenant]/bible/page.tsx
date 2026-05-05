import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { getTenant } from "@/lib/tenants";
import { Icon } from "@/components/icons";
import { LightRays } from "@/components/decorative";

export default async function BiblePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();
  void tenant;
  return (
    <div>
      <PageHeader
        eyebrow="BIBLE READING & QT"
        title="성경 통독 · 큐티"
        sub="매일 말씀과 함께하세요. 일년 통독 플랜과 큐티 가이드를 제공합니다."
      />
      <section className="section">
        <div className="container">
          <div className="bible-hero">
            <LightRays style={{ position: "absolute", inset: 0, color: "white", opacity: 0.4 }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", color: "var(--accent-glow)", textTransform: "uppercase" }}>
                DAY {D.bibleToday.day} / {D.bibleToday.totalDays}
              </div>
              <h2 className="bible-day-title">{D.bibleToday.title}</h2>
              <div className="bible-passages">
                {D.bibleToday.passages.map((p) => (
                  <span key={p} className="passage-pill">{p}</span>
                ))}
              </div>
              <div style={{ marginTop: 32 }}>
                <button className="btn btn-primary" style={{ background: "white", color: "var(--primary-deep)" }}>
                  <Icon.bible style={{ width: 16, height: 16 }} />
                  오늘 본문 읽기
                </button>
              </div>
            </div>
            <div className="bible-progress" style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, opacity: 0.85, letterSpacing: "0.05em" }}>
                나의 통독 진척
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 700, letterSpacing: "-0.03em" }}>
                  {D.bibleToday.progress}
                  <span style={{ fontSize: 18, fontWeight: 500, opacity: 0.7 }}>%</span>
                </span>
              </div>
              <div className="bible-bar">
                <div className="bible-bar-fill" style={{ width: `${D.bibleToday.progress}%` }} />
              </div>
              <div className="bible-stat-row">
                <span>{D.bibleToday.day} / {D.bibleToday.totalDays} 일</span>
                <span>🔥 {D.bibleToday.streak}일 연속</span>
              </div>
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid oklch(1 0 0 / 0.12)", fontSize: 13, opacity: 0.85 }}>
                통독표 다운로드 · 알림 설정
              </div>
            </div>
          </div>

          <div style={{ marginTop: 80 }}>
            <div className="section-head">
              <div>
                <span className="eyebrow">QT Guide</span>
                <h2>오늘의 큐티 가이드</h2>
              </div>
            </div>
            <div className="qt-grid">
              {D.qt.map((q) => (
                <div key={q.step} className="qt-card">
                  <div className="qt-step">{q.step}</div>
                  <div className="qt-q">{q.q}</div>
                  <textarea
                    rows={3}
                    placeholder="이곳에 묵상을 적어보세요..."
                    style={{
                      width: "100%",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-md)",
                      padding: 14,
                      fontSize: 14,
                      fontFamily: "inherit",
                      resize: "vertical",
                      background: "var(--surface-2)",
                      color: "var(--ink)",
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn btn-primary"><Icon.heart style={{ width: 14, height: 14 }} />묵상 저장하기</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
