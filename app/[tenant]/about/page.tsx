import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { getTenant } from "@/lib/tenants";
import { AboutTabs } from "./tabs";

export default async function AboutPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="ABOUT US"
        title="교회 소개"
        sub="성동에 뿌리내린 지 47년, 변치 않는 말씀 위에 새로운 시대를 함께 걸어가는 공동체입니다."
      />
      <section className="section">
        <div className="container">
          <AboutTabs pastor={D.pastor} vision={D.vision} history={D.history} staff={D.staff} />
        </div>
      </section>
    </div>
  );
}
