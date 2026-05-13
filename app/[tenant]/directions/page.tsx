import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { Icon } from "@/components/icons";
import { GoogleMap } from "@/components/google-map";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "찾아오시는 길", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  const addr = church.address ?? "";
  return buildChurchMetadata(church, pastor, {
    pageTitle: "찾아오시는 길",
    path: "/directions",
    pageDescription: `${church.name}을(를) 찾아오시는 방법을 안내합니다.${addr ? ` 주소: ${addr}.` : ""}${church.phone ? ` 문의: ${church.phone}.` : ""}`,
    extraKeywords: ["찾아오시는 길", "오시는 길", "주소", "지도", "교통", ...(addr ? [addr] : [])],
  });
}

type PublicTransportation = {
  id: number;
  icon: string | null;
  tag: string;
  title: string;
  description: string | null;
};

async function fetchTransportations(slug: string): Promise<PublicTransportation[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/transportations`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    return (body?.item?.transportations ?? []) as PublicTransportation[];
  } catch {
    return [];
  }
}

async function ChurchInfoSection({ tenant }: { tenant: string }) {
  const church = await fetchPublicChurch(tenant);
  const churchName = church?.name ?? "";
  const address = church?.address ?? "";
  const phone = church?.phone ?? "";
  const email = church?.email ?? "";

  return (
    <>
      <GoogleMap address={address} name={churchName} />

      <div className="info-grid">
        <div className="card info-card">
          <div className="info-card-head">
            <Icon.mapPin />
            <span>주소</span>
          </div>
          <div className="info-card-body">
            {address || <span className="info-card-empty">등록된 주소가 없습니다.</span>}
          </div>
        </div>
        <div className="card info-card">
          <div className="info-card-head">
            <Icon.phone />
            <span>연락처</span>
          </div>
          <div className="info-card-body">
            {phone ? (
              <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>{phone}</a>
            ) : (
              <span className="info-card-empty">등록된 연락처가 없습니다.</span>
            )}
          </div>
        </div>
        <div className="card info-card">
          <div className="info-card-head">
            <Icon.mail />
            <span>이메일</span>
          </div>
          <div className="info-card-body" style={{ wordBreak: "break-all" }}>
            {email ? (
              <a href={`mailto:${email}`}>{email}</a>
            ) : (
              <span className="info-card-empty">등록된 이메일이 없습니다.</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ChurchInfoSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <span className="skel" style={{ width: "100%", height: 360 }} />
      <div className="info-grid" style={{ marginTop: 24 }}>
        <span className="skel" style={{ height: 110 }} />
        <span className="skel" style={{ height: 110 }} />
        <span className="skel" style={{ height: 110 }} />
      </div>
    </div>
  );
}

async function TransportationsSection({ tenant }: { tenant: string }) {
  const items = await fetchTransportations(tenant);
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 64 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Transportation</span>
          <h2>대중교통 안내</h2>
        </div>
      </div>
      <div className="info-grid">
        {items.map((t) => (
          <div key={t.id} className="card">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              {t.icon && <span style={{ fontSize: 14 }}>{t.icon}</span>}
              <span>{t.tag}</span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--primary-deep)", letterSpacing: "-0.02em", margin: "4px 0 8px" }}>
              {t.title}
            </div>
            {t.description && <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{t.description}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TransportationsSkeleton() {
  return (
    <div className="info-grid" style={{ marginTop: 64 }}>
      <span className="skel" style={{ height: 130 }} />
      <span className="skel" style={{ height: 130 }} />
      <span className="skel" style={{ height: 130 }} />
    </div>
  );
}

export default async function DirectionsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <div>
      <PageHeader
        eyebrow="DIRECTIONS"
        title="찾아오시는 길"
        sub="처음 오시는 분도 어렵지 않게 안내해드립니다."
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<ChurchInfoSkeleton />}>
            <ChurchInfoSection tenant={tenant} />
          </Suspense>
          <Suspense fallback={<TransportationsSkeleton />}>
            <TransportationsSection tenant={tenant} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
