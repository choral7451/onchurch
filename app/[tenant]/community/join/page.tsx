import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { CommunityAuth } from "./auth";

function isCommunityEnabled(enabledPages: string[] | undefined | null): boolean {
  if (!enabledPages || enabledPages.length === 0) return true;
  return enabledPages.includes("community");
}

export const metadata: Metadata = {
  title: "성도 로그인 · 가입",
  robots: { index: false, follow: false },
};

export default async function CommunityJoinPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();
  if (!isCommunityEnabled(church.enabledPages)) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="COMMUNITY"
        title="성도 로그인"
        sub={`${church.name} 성도로 로그인하거나 가입하면 교제 게시판에 글을 남길 수 있습니다.`}
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 480 }}>
          <CommunityAuth slug={tenant} churchName={church.name} />
        </div>
      </section>
    </div>
  );
}
