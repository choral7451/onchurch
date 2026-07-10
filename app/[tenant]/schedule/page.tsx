import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Calendar } from "@/components/calendar";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { type Lang, pick, normalizeLang } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  if (!church) return { title: pick(lang, { ko: "일정", en: "Calendar" }), robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: pick(lang, { ko: "일정", en: "Calendar" }),
    path: "/schedule",
    pageDescription: pick(lang, {
      ko: `${church.name}의 월별 예배·행사 일정을 캘린더로 확인하세요.`,
      en: `Check ${church.name}'s monthly worship and event schedule on the calendar.`,
    }),
    extraKeywords: pick(lang, {
      ko: ["교회 일정", "행사 일정", "교회 캘린더", "예배 일정"],
      en: ["church calendar", "event schedule", "church events", "worship schedule"],
    }),
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

async function ScheduleContent({ tenant, initialYm, lang }: { tenant: string; initialYm?: string; lang: Lang }) {
  const events = await fetchEvents(tenant);
  return <Calendar events={events} initialYm={initialYm} lang={lang} />;
}

function ScheduleSkeleton() {
  return <span className="skel" style={{ width: "100%", height: 520 }} />;
}

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const { tenant } = await params;
  const { ym } = await searchParams;
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  return (
    <div>
      <PageHeader
        eyebrow="SCHEDULE"
        title={pick(lang, { ko: "교회 일정", en: "Church Calendar" })}
        sub={pick(lang, {
          ko: "이번 달 예배·행사 일정과 다가오는 모임을 한 곳에서 확인하세요.",
          en: "See this month's worship, events, and upcoming gatherings all in one place.",
        })}
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<ScheduleSkeleton />}>
            <ScheduleContent tenant={tenant} initialYm={ym} lang={lang} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
