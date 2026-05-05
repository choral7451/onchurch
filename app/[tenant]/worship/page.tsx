import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { getTenant } from "@/lib/tenants";

export default async function WorshipPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  void tenant;
  const D = getTenant(tenant);
  if (!D) notFound();
  return (
    <div>
      <PageHeader
        eyebrow="WORSHIP"
        title="예배 안내"
        sub="우리는 매주, 매일 모여 살아계신 하나님을 예배합니다. 어떤 예배든 함께하실 수 있습니다."
      />
      <section className="section">
        <div className="container">
          <div className="worship-grid">
            {D.worshipServices.map((w, i) => (
              <div key={i} className={`worship-card ${w.feat ? "feat" : ""}`}>
                <span className="worship-cat">{w.tag}</span>
                <div className="worship-name">{w.name}</div>
                <div className="worship-time">{w.time}</div>
                <div className="worship-meta">{w.meta}</div>
                {w.feat && <span className="worship-pill">대표 예배</span>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 64 }}>
            <div className="section-head">
              <div>
                <span className="eyebrow">Order of Worship</span>
                <h2>주일예배 순서</h2>
              </div>
            </div>
            <div className="card" style={{ padding: 0 }}>
              {D.worshipOrder.map((row, i) => (
                <div
                  key={row[0]}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 200px",
                    padding: "18px 28px",
                    borderBottom: i < D.worshipOrder.length - 1 ? "1px solid var(--line-2)" : "none",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{row[0]}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>{row[1]}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{row[2]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
