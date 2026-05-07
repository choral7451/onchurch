import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Calendar } from "@/components/calendar";
import { getTenant } from "@/lib/tenants";

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

export default async function SchedulePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();

  const events = await fetchEvents(tenant);

  return (
    <div>
      <PageHeader
        eyebrow="SCHEDULE"
        title="교회 일정"
        sub="이번 달 예배·행사 일정과 다가오는 모임을 한 곳에서 확인하세요."
      />
      <section className="section">
        <div className="container">
          <Calendar events={events} />
        </div>
      </section>
    </div>
  );
}
