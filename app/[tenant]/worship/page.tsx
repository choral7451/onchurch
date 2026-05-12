import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";

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

  return (
    <>
      <div className="worship-grid">
        {services.map((w) => (
          <div key={w.id} className={`worship-card ${w.isFeatured ? "feat" : ""}`}>
            <span className="worship-cat">{w.tag}</span>
            <div className="worship-name">{w.name}</div>
            <div className="worship-time">{w.time}</div>
            {w.meta && <div className="worship-meta">{w.meta}</div>}
            {w.isFeatured && <span className="worship-pill">대표 예배</span>}
          </div>
        ))}
      </div>

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

function WorshipSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <span className="skel" style={{ height: 160 }} />
        <span className="skel" style={{ height: 160 }} />
        <span className="skel" style={{ height: 160 }} />
      </div>
      <span className="skel" style={{ width: 220, height: 32, marginTop: 32 }} />
      <span className="skel" style={{ width: "100%", height: 60 }} />
      <span className="skel" style={{ width: "100%", height: 60 }} />
      <span className="skel" style={{ width: "100%", height: 60 }} />
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
