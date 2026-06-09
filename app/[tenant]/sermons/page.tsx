import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { SermonsList } from "./list";
import type { Sermon } from "@/lib/types";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "말씀", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "말씀",
    path: "/sermons",
    pageDescription: `${church.name}의 설교 영상을 카테고리별로 모아 보실 수 있습니다.${pastor?.name ? ` 담임목사 ${pastor.name}의 말씀.` : ""}`,
    extraKeywords: ["설교", "설교 영상", "말씀", "묵상", ...(pastor?.name ? [`${pastor.name} 설교`] : [])],
  });
}

type ApiSermonSeries = { id: number; name: string; isActive: boolean };
type ApiSermon = {
  id: number;
  seriesId: number | null;
  title: string;
  pastor: string | null;
  date: string | null;
  duration: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  bulletinUrl: string | null;
  summary: string | null;
  isFeatured: boolean;
};

const GRAD_CYCLE: Sermon["grad"][] = ["ph-grad-1", "ph-grad-2", "ph-grad-3", "ph-grad-4"];

async function fetchSermons(slug: string): Promise<{ series: ApiSermonSeries[]; sermons: ApiSermon[] }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/sermons`, {
      cache: "no-store",
    });
    if (!res.ok) return { series: [], sermons: [] };
    const body = await res.json();
    return {
      series: (body?.item?.series ?? []) as ApiSermonSeries[],
      sermons: (body?.item?.sermons ?? []) as ApiSermon[],
    };
  } catch {
    return { series: [], sermons: [] };
  }
}

async function SermonsContent({ tenant }: { tenant: string }) {
  const data = await fetchSermons(tenant);
  const seriesById = new Map(data.series.map((s) => [s.id, s.name] as const));
  const sermons: Sermon[] = data.sermons.map((s, i) => ({
    series: s.seriesId != null ? seriesById.get(s.seriesId) ?? "미분류" : "미분류",
    title: s.title,
    pastor: s.pastor ?? "",
    date: s.date ?? "",
    duration: s.duration ?? "",
    videoUrl: s.videoUrl,
    grad: GRAD_CYCLE[i % GRAD_CYCLE.length],
  }));
  const filters: string[] = ["전체", ...data.series.map((s) => s.name)];

  return <SermonsList sermons={sermons} filters={filters} />;
}

function SermonsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginBottom: 40 }}>
        <span className="skel" style={{ width: "100%", height: 280 }} />
        <span className="skel" style={{ width: "100%", height: 280 }} />
        <span className="skel" style={{ width: "100%", height: 280 }} />
      </div>
      <span className="skel" style={{ width: 220, height: 32 }} />
      <span className="skel" style={{ width: "100%", height: 80 }} />
      <span className="skel" style={{ width: "100%", height: 80 }} />
    </div>
  );
}

export default async function SermonsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <div>
      <PageHeader
        eyebrow="SERMONS"
        title="함께 드리는 예배"
        sub="지난 예배의 말씀을 언제든 다시 들으실 수 있습니다."
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<SermonsSkeleton />}>
            <SermonsContent tenant={tenant} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
