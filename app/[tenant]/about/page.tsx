import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { AboutTabs } from "./tabs";

type Pastor = {
  id: number;
  name: string;
  role: string | null;
  eng: string | null;
  message: string | null;
  longMessage: string | null;
  photoUrl: string | null;
};

type VisionItem = {
  id: number;
  ko: string;
  en: string | null;
  description: string | null;
};

type HistoryItem = {
  id: number;
  year: string;
  title: string;
  description: string | null;
};

type StaffMember = {
  id: number;
  name: string;
  role: string | null;
  area: string | null;
  photoUrl: string | null;
};

type AboutData = {
  pastor: Pastor | null;
  visions: VisionItem[];
  histories: HistoryItem[];
  staffs: StaffMember[];
};

async function fetchAbout(slug: string): Promise<AboutData> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/about`, {
      cache: "no-store",
    });
    if (!res.ok) return { pastor: null, visions: [], histories: [], staffs: [] };
    const body = await res.json();
    return {
      pastor: (body?.item?.pastor ?? null) as Pastor | null,
      visions: (body?.item?.visions ?? []) as VisionItem[],
      histories: (body?.item?.histories ?? []) as HistoryItem[],
      staffs: (body?.item?.staffs ?? []) as StaffMember[],
    };
  } catch {
    return { pastor: null, visions: [], histories: [], staffs: [] };
  }
}

async function AboutContent({ tenant }: { tenant: string }) {
  const [data, church] = await Promise.all([
    fetchAbout(tenant),
    fetchPublicChurch(tenant),
  ]);
  return (
    <AboutTabs
      pastor={data.pastor}
      vision={data.visions}
      history={data.histories}
      staff={data.staffs}
      enabledPages={church?.enabledPages ?? []}
    />
  );
}

function AboutSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <span className="skel" style={{ width: 320, height: 32 }} />
      <span className="skel" style={{ width: "100%", height: 220 }} />
      <span className="skel" style={{ width: "100%", height: 160 }} />
    </div>
  );
}

export default async function AboutPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <div>
      <PageHeader
        eyebrow="ABOUT US"
        title="교회 소개"
        sub="우리 교회를 소개합니다. 담임목사 인사 · 비전 · 연혁 · 교역자 소개를 확인하세요."
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<AboutSkeleton />}>
            <AboutContent tenant={tenant} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
