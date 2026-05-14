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
    pageDescription: `${church.name}의 주일·주중·새벽 예배 시간과 예배 순서를 안내합니다.${church.address ? ` 위치: ${church.address}.` : ""}`,
    extraKeywords: ["예배 안내", "주일예배", "수요예배", "새벽기도", "예배 시간", "예배 순서"],
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

type WorshipOrderItem = {
  id: number;
  no: string;
  item: string;
  leader: string | null;
};

type WorshipData = {
  services: WorshipServiceItem[];
  orders: WorshipOrderItem[];
};

async function fetchWorship(slug: string): Promise<WorshipData> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/worship`, {
      cache: "no-store",
    });
    if (!res.ok) return { services: [], orders: [] };
    const body = await res.json();
    return {
      services: (body?.item?.services ?? []) as WorshipServiceItem[],
      orders: (body?.item?.orders ?? []) as WorshipOrderItem[],
    };
  } catch {
    return { services: [], orders: [] };
  }
}

async function WorshipContent({ tenant }: { tenant: string }) {
  const data = await fetchWorship(tenant);
  const services = data.services;
  const orders = data.orders;
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

      {orders.length > 0 && (
        <div style={{ marginTop: 64 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Order of Worship</span>
              <h2>주일예배 순서</h2>
            </div>
          </div>
          <div className="card" style={{ padding: 0 }}>
            {orders.map((row, i) => (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 200px",
                  padding: "18px 28px",
                  borderBottom: i < orders.length - 1 ? "1px solid var(--line-2)" : "none",
                  alignItems: "center",
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{row.no}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>{row.item}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{row.leader ?? ""}</div>
              </div>
            ))}
          </div>
        </div>
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
