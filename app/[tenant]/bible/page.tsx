import { PageHeader } from "@/components/shell/page-header";

export default function BiblePage() {
  return (
    <div>
      <PageHeader
        eyebrow="BIBLE READING & QT"
        title="성경 통독 · 큐티"
        sub="매일 말씀과 함께하세요."
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
