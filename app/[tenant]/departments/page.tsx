import { PageHeader } from "@/components/shell/page-header";

export default function DepartmentsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="DEPARTMENTS"
        title="교회학교 · 부서"
        sub="유아부터 청년까지, 다음 세대를 위한 사역과 소그룹을 안내합니다."
      />
      <section className="section">
        <div className="container">
          <div className="card" style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
            <p style={{ fontSize: 16 }}>이 섹션은 곧 제공됩니다.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
