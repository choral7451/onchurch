import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { getPathPrefix } from "@/lib/path-prefix";
import { MyPageClient } from "./client";

export const metadata: Metadata = {
  title: "마이페이지",
  robots: { index: false, follow: false },
};

export default async function MyPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();
  const prefix = await getPathPrefix(tenant);

  return (
    <div>
      <PageHeader eyebrow="MY PAGE" title="마이페이지" sub={`${church.name}에서의 내 활동을 확인합니다.`} />
      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <MyPageClient slug={tenant} loginHref={`${prefix}/login`} communityHref={`${prefix}/community`} />
        </div>
      </section>
    </div>
  );
}
