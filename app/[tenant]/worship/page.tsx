import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { type Lang, normalizeLang, pick } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "예배 안내", robots: { index: false, follow: false } };
  const lang = normalizeLang(church.siteLang);
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: pick(lang, { ko: "예배 안내", en: "Worship" }),
    path: "/worship",
    pageDescription: pick(lang, {
      ko: `${church.name}의 주일·주중·새벽 예배 시간을 안내합니다.${church.address ? ` 위치: ${church.address}.` : ""}`,
      en: `Service times for Sunday, weekday, and dawn worship at ${church.name}.${church.address ? ` Location: ${church.address}.` : ""}`,
    }),
    extraKeywords: pick(lang, {
      ko: ["예배 안내", "주일예배", "수요예배", "새벽기도", "예배 시간"],
      en: ["Worship", "Sunday Service", "Wednesday Service", "Dawn Prayer", "service times"],
    }),
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

async function WorshipContent({ tenant, lang }: { tenant: string; lang: Lang }) {
  const data = await fetchWorship(tenant);
  const services = data.services;
  const weekServices = services.filter((s) => s.tag === "WEEK");
  const dailyServices = services.filter((s) => s.tag === "DAILY");

  return (
    <>
      {weekServices.length > 0 && (
        <WorshipTable heading={pick(lang, { ko: "주일·주중 예배", en: "Weekly Services" })} services={weekServices} lang={lang} />
      )}
      {dailyServices.length > 0 && (
        <WorshipTable heading={pick(lang, { ko: "매일 예배", en: "Daily Services" })} services={dailyServices} lang={lang} style={{ marginTop: weekServices.length > 0 ? 40 : 0 }} />
      )}
      {services.length === 0 && (
        <p style={{ color: "var(--muted)", textAlign: "center", padding: "40px 0" }}>
          {pick(lang, { ko: "등록된 예배가 없습니다.", en: "No services yet." })}
        </p>
      )}
    </>
  );
}

function WorshipTable({ heading, services, lang, style }: { heading: string; services: WorshipServiceItem[]; lang: Lang; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <h2 className="worship-table-heading">{heading}</h2>
      <div className="worship-table" role="table">
        <div className="worship-table-head" role="row">
          <div role="columnheader">{pick(lang, { ko: "예배", en: "Service" })}</div>
          <div role="columnheader">{pick(lang, { ko: "시간", en: "Time" })}</div>
          <div role="columnheader">{pick(lang, { ko: "안내", en: "Info" })}</div>
        </div>
        {services.map((w) => (
          <div key={w.id} className={`worship-table-row ${w.isFeatured ? "feat" : ""}`} role="row">
            <div className="worship-table-cell name" role="cell">
              <div className="worship-table-name">{w.name}</div>
              {w.isFeatured && <span className="worship-pill">{pick(lang, { ko: "대표", en: "Main" })}</span>}
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
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  return (
    <div>
      <PageHeader
        eyebrow="WORSHIP"
        title={pick(lang, { ko: "예배 안내", en: "Worship" })}
        sub={pick(lang, {
          ko: "우리는 매주, 매일 모여 살아계신 하나님을 예배합니다. 어떤 예배든 함께하실 수 있습니다.",
          en: "We gather every week and every day to worship the living God. You are welcome at any service.",
        })}
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<WorshipSkeleton />}>
            <WorshipContent tenant={tenant} lang={lang} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
