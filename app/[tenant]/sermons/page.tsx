import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { getTenant } from "@/lib/tenants";
import { SermonsList } from "./list";
import { SermonCard } from "@/components/sermon-card";

export default async function SermonsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="SERMONS"
        title="설교 영상 · 주보"
        sub="지난 설교를 언제든 다시 듣고, 주보를 받아보세요. 매주 화요일에 새 영상이 업로드됩니다."
      />
      <section className="section">
        <div className="container">
          <div className="sermon-grid" style={{ marginBottom: 56 }}>
            <SermonCard sermon={D.sermons[0]} feat />
            <SermonCard sermon={D.sermons[1]} />
            <SermonCard sermon={D.sermons[2]} />
          </div>
          <SermonsList sermons={D.sermons} filters={D.sermonFilters} />
        </div>
      </section>
    </div>
  );
}
