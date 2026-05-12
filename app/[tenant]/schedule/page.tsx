import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Calendar } from "@/components/calendar";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "일정", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "일정",
    path: "/schedule",
    pageDescription: `${church.name}의 월별 예배·행사 일정을 캘린더로 확인하세요.`,
    extraKeywords: ["교회 일정", "행사 일정", "교회 캘린더", "예배 일정"],
  });
}

type EventItem = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
  isActive: boolean;
};

async function fetchEvents(slug: string): Promise<EventItem[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/events`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    return (body?.item?.events ?? []) as EventItem[];
  } catch {
    return [];
  }
}

async function ScheduleContent({ tenant }: { tenant: string }) {
  const events = await fetchEvents(tenant);
  return <Calendar events={events} />;
}

function ScheduleSkeleton() {
  return <span className="skel" style={{ width: "100%", height: 520 }} />;
}

export default async function SchedulePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <div>
      <PageHeader
        eyebrow="SCHEDULE"
        title="교회 일정"
        sub="이번 달 예배·행사 일정과 다가오는 모임을 한 곳에서 확인하세요."
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<ScheduleSkeleton />}>
            <ScheduleContent tenant={tenant} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
