import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { getTenant } from "@/lib/tenants";
import { NoticesList } from "./list";

export default async function NoticesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="NOTICES"
        title="공지사항 · 교회 소식"
        sub="교회의 공지와 행사 일정을 한 곳에서 확인하세요."
      />
      <section className="section">
        <div className="container">
          <NoticesList notices={D.notices} categories={D.noticeCategories} />
        </div>
      </section>
    </div>
  );
}
