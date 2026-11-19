import { Fragment, type ReactNode } from "react";
import type { PublicChurch } from "@/lib/public-site";
import { fetchLiveStatus } from "@/lib/public-site";
import type { Lang } from "@/lib/i18n";
import { LiveBadge } from "@/components/live-badge";
import { Reveal } from "@/components/reveal";
import { buildDefaultHomeSections } from "@/components/templates/default/home";
import { buildModernHomeSections } from "@/components/templates/modern/home";
import { mixedSectionOrder, resolveSectionDesign, type SectionDesignId, type SiteDesign } from "@/lib/site-design";
import type { HomeSectionKey } from "@/lib/home-sections";

// 디자인 설정이 있는 교회의 홈. 섹션마다 기본/모던 구현 중 설정된 쪽을 골라 순서대로 그린다.
// 설정이 없는 섹션은 site_template(기본/모던)을 따른다.
// 모던 섹션은 .chc-root 로 감싸 모던 전용 CSS 변수·스타일이 그 섹션 안에서만 적용되게 한다.
type Props = {
  church: PublicChurch;
  tenant: string;
  lang: Lang;
  pathPrefix: string;
  design: SiteDesign | null;
  order: string[] | null | undefined;
};

export async function MixedHome({ church, tenant, lang, pathPrefix, design, order }: Props) {
  const url = (path: string) => `${pathPrefix}${path}`;
  const enabled = church.enabledPages ?? [];
  const isPageEnabled = (id: string) => (id === "directions" ? !enabled.includes("hide:directions") : enabled.length === 0 || enabled.includes(id));
  const sermonsEnabled = isPageEnabled("sermons");
  const initialLive = sermonsEnabled ? (await fetchLiveStatus(tenant)).isLive : false;

  const input = { church, tenant, lang, pathPrefix, initialLive };
  const defaults = buildDefaultHomeSections(input);
  const moderns = buildModernHomeSections(input);

  type Rendered = { key: HomeSectionKey; variant: SectionDesignId; node: ReactNode };
  const rendered: Rendered[] = [];
  for (const key of mixedSectionOrder(order)) {
    const variant = resolveSectionDesign(design, church.siteTemplate, key);
    // 담임목사 인사는 '교회 소개' 메뉴와 짝이라, 그 메뉴를 끄면 홈에서도 함께 숨긴다.
    if (key === "pastor" && !isPageEnabled("about")) continue;
    // 상단 배너·빠른 이동·찾아오시는 길은 기본이 표시라, 끈 경우에만 enabledPages 에 hide:* 로 남는다.
    if (key === "banner" && enabled.includes("hide:banner")) continue;
    if (key === "quick" && enabled.includes("hide:quick")) continue;
    if (key === "visit" && !isPageEnabled("directions")) continue;
    const node = variant === "modern" ? moderns[key] : defaults[key];
    if (node) rendered.push({ key, variant, node });
  }

  return (
    <div>
      {sermonsEnabled && <LiveBadge slug={tenant} sermonsHref={url("/sermons")} initialLive={initialLive} />}
      {rendered.map(({ key, variant, node }, i) => {
        if (variant === "modern") {
          return (
            <div key={key} className="chc-root">
              {node}
            </div>
          );
        }
        // 기본 홈과 같이 첫 섹션은 바로 노출하고 두 번째부터 리빌 애니메이션.
        return i === 0 ? <Fragment key={key}>{node}</Fragment> : <Reveal key={key}>{node}</Reveal>;
      })}
    </div>
  );
}
