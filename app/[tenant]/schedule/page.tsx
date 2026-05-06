import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Calendar } from "@/components/calendar";
import { getTenant } from "@/lib/tenants";

export default async function SchedulePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="SCHEDULE"
        title="교회 일정"
        sub="이번 달 예배·행사 일정과 다가오는 모임을 한 곳에서 확인하세요."
      />
      <section className="section">
        <div className="container">
          <Calendar config={D.calendar} events={D.events} />
        </div>
      </section>
    </div>
  );
}
