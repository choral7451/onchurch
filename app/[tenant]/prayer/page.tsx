import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { PrayerForm } from "@/app/[tenant]/prayer/form";

const CATEGORIES = ["가정", "건강", "직장/학업", "신앙", "관계", "기타"];
const SCOPES = ["중보기도팀", "담임 목사님", "전체 공개"];

function isPrayerEnabled(enabledPages: string[] | undefined | null): boolean {
  if (!enabledPages || enabledPages.length === 0) return true;
  return enabledPages.includes("prayer");
}

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "기도 요청", robots: { index: false, follow: false } };
  if (!isPrayerEnabled(church.enabledPages)) {
    return { title: "기도 요청", robots: { index: false, follow: false } };
  }
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "기도 요청",
    path: "/prayer",
    pageDescription: `${church.name}에 기도 제목을 보내주시면 함께 마음을 모아 기도해드립니다.`,
    extraKeywords: ["기도 요청", "중보기도", "기도 제목"],
  });
}

export default async function PrayerPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();
  if (!isPrayerEnabled(church.enabledPages)) notFound();
  return (
    <div>
      <PageHeader
        eyebrow="PRAYER REQUEST"
        title="기도 요청"
        sub="혼자 감당하기 어려운 일들이 있으신가요? 함께 마음을 모아 기도해드립니다."
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <PrayerForm slug={tenant} categories={CATEGORIES} scopes={SCOPES} />
        </div>
      </section>
    </div>
  );
}
