import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { GalleryView } from "./view";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { type Lang, pick, normalizeLang } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  if (!church) return { title: pick(lang, { ko: "갤러리", en: "Gallery" }), robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: pick(lang, { ko: "갤러리", en: "Gallery" }),
    path: "/gallery",
    pageDescription: pick(lang, {
      ko: `${church.name}의 공동체 사진과 행사 기록을 갤러리로 만나보세요.`,
      en: `Explore ${church.name}'s community photos and event highlights in the gallery.`,
    }),
    extraKeywords: pick(lang, {
      ko: ["갤러리", "교회 사진", "행사 사진", "공동체"],
      en: ["gallery", "church photos", "event photos", "community"],
    }),
  });
}

const LAYOUT = [
  { col: 6, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 1 },
  { col: 3, row: 1 }, { col: 4, row: 2 }, { col: 4, row: 1 },
  { col: 4, row: 1 }, { col: 4, row: 1 }, { col: 4, row: 1 },
];

type ApiCategory = { id: number; name: string; isActive: boolean; isAll: boolean };
type ApiGroupPhoto = { id: number; photoUrl: string | null; grad: string | null; title: string; date: string | null };
type ApiGroup = {
  groupKey: string;
  categoryId: number | null;
  title: string;
  date: string | null;
  coverUrl: string | null;
  grad: string | null;
  count: number;
  photos: ApiGroupPhoto[];
};

const PAGE_SIZE = 12;

async function fetchGalleryFirstPage(
  slug: string,
): Promise<{ categories: ApiCategory[]; groups: ApiGroup[]; totalCount: number }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/galleries?page=1&size=${PAGE_SIZE}`, {
      cache: "no-store",
    });
    if (!res.ok) return { categories: [], groups: [], totalCount: 0 };
    const body = await res.json();
    return {
      categories: (body?.item?.categories ?? []) as ApiCategory[],
      groups: (body?.item?.groups ?? []) as ApiGroup[],
      totalCount: (body?.item?.totalCount ?? 0) as number,
    };
  } catch {
    return { categories: [], groups: [], totalCount: 0 };
  }
}

async function GalleryContent({ tenant, lang }: { tenant: string; lang: Lang }) {
  const data = await fetchGalleryFirstPage(tenant);
  return (
    <GalleryView
      slug={tenant}
      categories={data.categories}
      initialGroups={data.groups}
      totalCount={data.totalCount}
      pageSize={PAGE_SIZE}
      layout={LAYOUT}
      lang={lang}
    />
  );
}

function GallerySkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
      <span className="skel" style={{ gridColumn: "span 6", height: 320 }} />
      <span className="skel" style={{ gridColumn: "span 3", height: 320 }} />
      <span className="skel" style={{ gridColumn: "span 3", height: 150 }} />
      <span className="skel" style={{ gridColumn: "span 3", height: 150 }} />
      <span className="skel" style={{ gridColumn: "span 4", height: 320 }} />
      <span className="skel" style={{ gridColumn: "span 4", height: 150 }} />
      <span className="skel" style={{ gridColumn: "span 4", height: 150 }} />
    </div>
  );
}

export default async function GalleryPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  return (
    <div>
      <PageHeader
        eyebrow="GALLERY"
        title={pick(lang, { ko: "갤러리", en: "Gallery" })}
        sub={pick(lang, {
          ko: "우리 공동체의 사진과 추억을 모아 두는 곳입니다.",
          en: "A place to gather our community's photos and memories.",
        })}
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<GallerySkeleton />}>
            <GalleryContent tenant={tenant} lang={lang} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
