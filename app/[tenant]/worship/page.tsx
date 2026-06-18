import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "예배 안내", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "예배 안내",
    path: "/worship",
    pageDescription: `${church.name}의 주일·주중·새벽 예배 시간을 안내합니다.${church.address ? ` 위치: ${church.address}.` : ""}`,
    extraKeywords: ["예배 안내", "주일예배", "수요예배", "새벽기도", "예배 시간"],
  });
}

type WorshipServiceTag = "WEEK" | "DAILY";

type WorshipServiceItem = {
  id: number;
  tag: WorshipServiceTag;
  name: string;
  time: string;
  meta: string | null;
  isFeatured: boolean;
};

type WorshipData = {
  services: WorshipServiceItem[];
};

async function fetchWorship(slug: string): Promise<WorshipData> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/worship`, {
      cache: "no-store",
    });
    if (!res.ok) return { services: [] };
    const body = await res.json();
    return {
      services: (body?.item?.services ?? []) as WorshipServiceItem[],
    };
  } catch {
    return { services: [] };
  }
}

async function WorshipContent({ tenant }: { tenant: string }) {
  const data = await fetchWorship(tenant);
  const services = data.services;
  const weekServices = services.filter((s) => s.tag === "WEEK");
  const dailyServices = services.filter((s) => s.tag === "DAILY");

  return (
    <>
      {weekServices.length > 0 && (
        <WorshipTable heading="주일·주중 예배" services={weekServices} />
      )}
      {dailyServices.length > 0 && (
        <WorshipTable heading="매일 예배" services={dailyServices} style={{ marginTop: weekServices.length > 0 ? 40 : 0 }} />
      )}
      {services.length === 0 && (
        <p style={{ color: "var(--muted)", textAlign: "center", padding: "40px 0" }}>
          등록된 예배가 없습니다.
        </p>
      )}
    </>
  );
}

function WorshipTable({ heading, services, style }: { heading: string; services: WorshipServiceItem[]; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <h2 className="worship-table-heading">{heading}</h2>
      <div className="worship-table" role="table">
        <div className="worship-table-head" role="row">
          <div role="columnheader">예배</div>
          <div role="columnheader">시간</div>
          <div role="columnheader">안내</div>
        </div>
        {services.map((w) => (
          <div key={w.id} className={`worship-table-row ${w.isFeatured ? "feat" : ""}`} role="row">
            <div className="worship-table-cell name" role="cell">
              <div className="worship-table-name">{w.name}</div>
              {w.isFeatured && <span className="worship-pill">대표</span>}
            </div>
            <div className="worship-table-cell time" role="cell">{w.time}</div>
            <div className="worship-table-cell meta" role="cell">{w.meta || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorshipSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span className="skel" style={{ width: 200, height: 28 }} />
      <span className="skel" style={{ width: "100%", height: 56 }} />
      <span className="skel" style={{ width: "100%", height: 56 }} />
      <span className="skel" style={{ width: "100%", height: 56 }} />
      <span className="skel" style={{ width: 200, height: 28, marginTop: 24 }} />
      <span className="skel" style={{ width: "100%", height: 56 }} />
      <span className="skel" style={{ width: "100%", height: 56 }} />
    </div>
  );
}

export default async function WorshipPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <div>
      <PageHeader
        eyebrow="WORSHIP"
        title="예배 안내"
        sub="우리는 매주, 매일 모여 살아계신 하나님을 예배합니다. 어떤 예배든 함께하실 수 있습니다."
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<WorshipSkeleton />}>
            <WorshipContent tenant={tenant} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
