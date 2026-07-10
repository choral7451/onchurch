import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { SermonsList } from "./list";
import type { Sermon } from "@/lib/types";
import { fetchPublicChurch, fetchLiveStatus } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { SermonLive } from "@/components/sermon-live";
import { type Lang, pick, normalizeLang } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "말씀", robots: { index: false, follow: false } };
  const lang = normalizeLang(church.siteLang);
  const pastor = await fetchPublicPastor(tenant);
  const t = pick(lang, {
    ko: {
      pageTitle: "말씀",
      pageDescription: `${church.name}의 설교 영상을 카테고리별로 모아 보실 수 있습니다.${pastor?.name ? ` 담임목사 ${pastor.name}의 말씀.` : ""}`,
      extraKeywords: ["설교", "설교 영상", "말씀", "묵상", ...(pastor?.name ? [`${pastor.name} 설교`] : [])],
    },
    en: {
      pageTitle: "Sermons",
      pageDescription: `Browse sermon videos from ${church.name} by category.${pastor?.name ? ` Messages by Pastor ${pastor.name}.` : ""}`,
      extraKeywords: ["sermons", "sermon videos", "messages", "devotion", ...(pastor?.name ? [`${pastor.name} sermons`] : [])],
    },
  });
  return buildChurchMetadata(church, pastor, {
    pageTitle: t.pageTitle,
    path: "/sermons",
    pageDescription: t.pageDescription,
    extraKeywords: t.extraKeywords,
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

async function SermonsContent({ tenant, lang }: { tenant: string; lang: Lang }) {
  const [data, church, liveStatus] = await Promise.all([
    fetchSermons(tenant),
    fetchPublicChurch(tenant),
    fetchLiveStatus(tenant),
  ]);
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
  // '전체'는 백엔드의 is_all series(이름 '전체')로 내려온다. 관리자가 '전체'를 삭제하면 칩도 사라진다.
  const filters: string[] = data.series.map((s) => s.name);

  return (
    <>
      <SermonLive
        slug={tenant}
        initialLive={liveStatus.isLive}
        initialVideoId={liveStatus.videoId}
        liveUrl={church?.liveUrl ?? null}
      />
      <SermonsList sermons={sermons} filters={filters} lang={lang} />
    </>
  );
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
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  const t = pick(lang, {
    ko: { title: "함께 드리는 예배", sub: "지난 예배의 말씀을 언제든 다시 들으실 수 있습니다." },
    en: { title: "Worship Together", sub: "Revisit the messages from our past services anytime." },
  });
  return (
    <div>
      <PageHeader
        eyebrow="SERMONS"
        title={t.title}
        sub={t.sub}
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<SermonsSkeleton />}>
            <SermonsContent tenant={tenant} lang={lang} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
