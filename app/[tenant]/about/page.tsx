import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { normalizeLang, pick } from "@/lib/i18n";
import { AboutTabs } from "./tabs";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "교회 소개", robots: { index: false, follow: false } };
  const lang = normalizeLang(church.siteLang);
  const pastor = await fetchPublicPastor(tenant);
  const pastorPhrase = pastor?.name
    ? pick(lang, {
        ko: `담임목사 ${pastor.name}${pastor.role ? ` ${pastor.role}` : ""}의 인사말과 `,
        en: `the greeting from ${pastor.role ? `${pastor.role} ` : ""}${pastor.name} and `,
      })
    : "";
  return buildChurchMetadata(church, pastor, {
    pageTitle: pick(lang, { ko: "교회 소개", en: "About" }),
    path: "/about",
    pageDescription: pick(lang, {
      ko: `${pastorPhrase}${church.name}의 비전·연혁·섬김의 사람들을 소개합니다.${church.address ? ` 위치: ${church.address}.` : ""}`,
      en: `${pastorPhrase}Introducing the vision, history, and team of ${church.name}.${church.address ? ` Location: ${church.address}.` : ""}`,
    }),
    extraKeywords: pick(lang, {
      ko: ["교회 소개", "비전", "연혁", "섬김의 사람들", ...(pastor?.name ? [pastor.name, `${pastor.name} 담임목사`] : [])],
      en: ["About", "Vision", "History", "Our Team", ...(pastor?.name ? [pastor.name, `Pastor ${pastor.name}`] : [])],
    }),
  });
}

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
  phone: string | null;
  email: string | null;
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
      lang={normalizeLang(church?.siteLang)}
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

function josaUlReul(text: string): "을" | "를" {
  const last = text[text.length - 1];
  if (!last) return "를";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "를";
  return (code - 0xac00) % 28 === 0 ? "를" : "을";
}

export default async function AboutPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  const enabled = church?.enabledPages ?? [];
  const isOn = (key: string) => enabled.length === 0 || enabled.includes(key);

  const sections: { ko: string; en: string }[] = [{ ko: "담임목사 인사", en: "Pastor's Greeting" }];
  if (isOn("about-vision")) sections.push({ ko: "비전", en: "Vision" });
  if (isOn("about-history")) sections.push({ ko: "연혁", en: "History" });
  if (isOn("about-staff")) sections.push({ ko: "섬김의 사람들", en: "Our Team" });
  const koList = sections.map((s) => s.ko).join(" · ");
  const enList = sections.map((s) => s.en).join(" · ");
  const koLast = sections[sections.length - 1].ko;
  const sub = pick(lang, {
    ko: `우리 교회를 소개합니다. ${koList}${josaUlReul(koLast)} 확인하세요.`,
    en: `Get to know our church. Explore ${enList}.`,
  });

  return (
    <div>
      <PageHeader eyebrow="ABOUT US" title={pick(lang, { ko: "교회 소개", en: "About" })} sub={sub} />
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
