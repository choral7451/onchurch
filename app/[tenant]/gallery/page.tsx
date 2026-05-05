import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { getTenant } from "@/lib/tenants";

const LAYOUT = [
  { col: 6, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 1 },
  { col: 3, row: 1 }, { col: 4, row: 2 }, { col: 4, row: 1 },
  { col: 4, row: 1 }, { col: 4, row: 1 }, { col: 4, row: 1 },
];

export default async function GalleryPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();
  void tenant;
  return (
    <div>
      <PageHeader eyebrow="GALLERY" title="갤러리" sub="우리 공동체의 사진과 추억을 모아 두는 곳입니다." />
      <section className="section">
        <div className="container">
          <div className="chips">
            {D.galleryCategories.map((c, i) => (
              <div key={c} className={`chip ${i === 0 ? "active" : ""}`}>{c}</div>
            ))}
          </div>
          <div className="gallery-grid">
            {D.galleries.map((g, i) => {
              const l = LAYOUT[i] ?? { col: 4, row: 1 };
              return (
                <div key={g.title} className="gallery-item" style={{ gridColumn: `span ${l.col}`, gridRow: `span ${l.row}` }}>
                  <div className={`placeholder-img ${g.grad}`}>
                    <span className="placeholder-img-tag">PHOTO · {g.date}</span>
                  </div>
                  <div className="gallery-overlay">
                    <div className="gallery-cap-title">{g.title}</div>
                    <div className="gallery-cap-meta">{g.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
            <button className="btn btn-secondary btn-lg">더 보기</button>
          </div>
        </div>
      </section>
    </div>
  );
}
