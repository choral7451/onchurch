import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { getTenant } from "@/lib/tenants";

export default async function DepartmentsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();
  void tenant;
  return (
    <div>
      <PageHeader
        eyebrow="MINISTRY"
        title="교회학교 · 부서 안내"
        sub="태어나면서부터 청년이 될 때까지, 모든 세대가 자기 자리에서 깊이 자라갑니다."
      />
      <section className="section">
        <div className="container">
          <div className="dept-grid">
            {D.departments.map((d) => (
              <div key={d.tag} className="dept-card">
                <div className="dept-tag">{d.tag}</div>
                <div className="dept-name">{d.name}</div>
                <div className="dept-age">{d.age} · 매주 주일 오전</div>
                <div className="dept-meta">
                  <div className="dept-leader">담당 교역자<strong>{d.leader}</strong></div>
                  <div className="dept-count">{d.count}<span> 명</span></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 80 }}>
            <div className="section-head">
              <div>
                <span className="eyebrow">Small Groups</span>
                <h2>소그룹 (셀모임)</h2>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {D.smallGroups.map((c) => (
                <div key={c.name} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: 18 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--primary-deep)" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{c.count}명 · {c.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
