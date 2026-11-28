import type { ReactNode } from "react";
import type { HomeSectionKey } from "@/lib/home-sections";
import type { SectionDesignId } from "@/lib/site-design";

// 관리자 '메뉴 · 홈 구성'에서 섹션 디자인을 고를 때 보여주는 모형 그림과 설명.
// 실제 공개 홈(components/templates/default·modern/home.tsx)의 배치를 단순한 도형으로 옮겼다. 배치가 바뀌면 함께 고친다.

export const SECTION_DESIGN_DESCS: Record<HomeSectionKey, Record<SectionDesignId, string>> = {
  banner: { default: "여백을 둔 둥근 배너", modern: "화면을 꽉 채운 배너 + 예배·주소·전화 띠" },
  events: { default: "큰 일정 카드 + 옆에 목록", modern: "날짜 카드 3개를 나란히" },
  quick: { default: "아이콘이 있는 카드", modern: "선으로 나눈 글자 메뉴" },
  worship: { default: "큰 예배 카드 3개", modern: "작은 예배 카드를 한 줄로" },
  sermons: { default: "같은 크기 영상 3개", modern: "큰 영상 2개 + 작은 영상 4개" },
  news: { default: "카드 안에 날짜와 글 목록", modern: "선만 있는 깔끔한 목록" },
  visit: { default: "한 줄 안내 카드", modern: "진한 배경 + 지도" },
  pastor: { default: "사진 왼쪽, 인사말 오른쪽", modern: "인사말 왼쪽, 사진 오른쪽" },
  gallery: { default: "사진 + 제목 카드", modern: "테두리 없이 사진을 크게" },
};

const MAIN = "#1f3a5f";
const IMG = "#c9d6e4";
const LINE = "#cfd6e0";
const SOFT = "#e9edf3";
const ON_DARK = "rgba(255,255,255,0.55)";

function Box({ x, y, w, h, fill = "#fff", r = 5, stroke }: { x: number; y: number; w: number; h: number; fill?: string; r?: number; stroke?: boolean }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke ? LINE : undefined} strokeWidth={stroke ? 1 : undefined} />;
}

function Text({ x, y, w, fill = LINE, h = 3 }: { x: number; y: number; w: number; fill?: string; h?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} />;
}

// 섹션 제목(기본은 굵은 고딕, 모던은 얇고 넓은 명조 느낌으로 조금 다르게).
function Heading({ variant }: { variant: SectionDesignId }) {
  return variant === "modern" ? (
    <>
      <Text x={12} y={10} w={16} h={2} fill={LINE} />
      <Text x={12} y={16} w={44} h={5} fill="#3a4658" />
    </>
  ) : (
    <>
      <Text x={10} y={10} w={14} h={2} fill="#8fb3dc" />
      <Text x={10} y={16} w={38} h={6} fill={MAIN} />
    </>
  );
}

function shapes(section: HomeSectionKey, v: SectionDesignId): ReactNode {
  const m = v === "modern";
  switch (section) {
    case "banner":
      return m ? (
        <>
          <Box x={0} y={0} w={200} h={90} fill={IMG} r={0} />
          <Text x={70} y={38} w={60} h={5} fill="#fff" />
          <Text x={80} y={48} w={40} fill="#fff" />
          <Box x={0} y={90} w={200} h={30} fill={MAIN} r={0} />
          {[14, 80, 146].map((x) => <Text key={x} x={x} y={103} w={40} fill={ON_DARK} />)}
        </>
      ) : (
        <>
          <Box x={10} y={10} w={180} h={100} fill={IMG} r={8} />
          <Text x={70} y={52} w={60} h={5} fill="#fff" />
          <Text x={80} y={62} w={40} fill="#fff" />
        </>
      );
    case "events":
      return m ? (
        <>
          <Heading variant={v} />
          {[12, 74, 136].map((x) => (
            <g key={x}>
              <Box x={x} y={38} w={54} h={62} stroke />
              <Text x={x + 7} y={46} w={12} h={8} fill="#3a4658" />
              <Text x={x + 7} y={62} w={36} />
              <Text x={x + 7} y={70} w={28} fill={SOFT} />
              <Text x={x + 7} y={88} w={24} fill={SOFT} />
            </g>
          ))}
        </>
      ) : (
        <>
          <Box x={10} y={14} w={112} h={92} fill={MAIN} r={8} />
          <Text x={20} y={26} w={30} h={5} fill={ON_DARK} />
          <Text x={20} y={38} w={64} h={7} fill="#fff" />
          <Text x={20} y={52} w={44} fill={ON_DARK} />
          <Box x={20} y={88} w={34} h={9} r={4.5} fill="rgba(255,255,255,0.18)" />
          <Box x={128} y={14} w={62} h={92} stroke r={8} />
          <Text x={135} y={24} w={30} fill="#3a4658" />
          {[40, 58, 76].map((y) => (
            <g key={y}>
              <Text x={135} y={y} w={8} h={6} fill={MAIN} />
              <Text x={148} y={y} w={30} />
              <Text x={148} y={y + 6} w={18} fill={SOFT} />
            </g>
          ))}
        </>
      );
    case "quick":
      return m ? (
        <>
          <Box x={0} y={0} w={200} h={120} fill="#fff" r={0} />
          {[12, 59, 106, 153].map((x, i) => (
            <g key={x}>
              {i > 0 && <rect x={x - 5} y={40} width={1} height={36} fill={LINE} />}
              <Text x={x} y={48} w={26} h={4} fill="#3a4658" />
              <Text x={x} y={58} w={34} fill={SOFT} />
            </g>
          ))}
          <rect x={0} y={88} width={200} height={1} fill={LINE} />
        </>
      ) : (
        <>
          {[10, 56, 102, 148].map((x) => (
            <g key={x}>
              <Box x={x} y={30} w={42} h={60} stroke r={6} />
              <Box x={x + 6} y={37} w={10} h={10} r={3} fill="#dde9f6" />
              <Text x={x + 6} y={54} w={22} h={4} fill="#3a4658" />
              <Text x={x + 6} y={63} w={28} fill={SOFT} />
              <Text x={x + 6} y={78} w={16} h={2.5} fill="#8fb3dc" />
            </g>
          ))}
        </>
      );
    case "worship":
      return m ? (
        <>
          <Heading variant={v} />
          {[12, 48, 84, 120, 156].map((x, i) => (
            <g key={x}>
              <Box x={x} y={44} w={32} h={34} r={4} fill={i === 0 ? MAIN : "#fff"} stroke={i !== 0} />
              <Text x={x + 5} y={52} w={16} h={2.5} fill={i === 0 ? ON_DARK : SOFT} />
              <Text x={x + 5} y={62} w={20} h={5} fill={i === 0 ? "#fff" : "#3a4658"} />
            </g>
          ))}
        </>
      ) : (
        <>
          <Heading variant={v} />
          {[10, 72, 134].map((x, i) => (
            <g key={x}>
              <Box x={x} y={36} w={56} h={64} r={7} fill={i === 0 ? "#2f4e72" : "#fff"} stroke={i !== 0} />
              <Text x={x + 7} y={46} w={12} h={2.5} fill={i === 0 ? ON_DARK : "#8fb3dc"} />
              <Text x={x + 7} y={56} w={26} h={4} fill={i === 0 ? "#fff" : "#3a4658"} />
              <Text x={x + 7} y={68} w={34} h={7} fill={i === 0 ? "#fff" : "#3a4658"} />
            </g>
          ))}
        </>
      );
    case "sermons":
      return m ? (
        <>
          <Heading variant={v} />
          {[12, 103].map((x) => (
            <g key={x}>
              <Box x={x} y={30} w={85} h={40} r={4} fill={IMG} />
              <Text x={x} y={74} w={60} fill="#3a4658" />
            </g>
          ))}
          {[12, 59, 106, 153].map((x) => (
            <g key={x}>
              <Box x={x} y={84} w={41} h={22} r={3} fill={IMG} />
              <Text x={x} y={110} w={30} h={2.5} />
            </g>
          ))}
        </>
      ) : (
        <>
          <Heading variant={v} />
          {[10, 72, 134].map((x) => (
            <g key={x}>
              <Box x={x} y={34} w={56} h={72} stroke r={7} />
              <path d={`M${x + 7} ${34}h${42}a7 7 0 0 1 7 7v31h-56v-31a7 7 0 0 1 7-7z`} fill={IMG} />
              <circle cx={x + 28} cy={53} r={5} fill="#fff" />
              <Text x={x + 6} y={79} w={14} h={2.5} fill="#8fb3dc" />
              <Text x={x + 6} y={87} w={40} fill="#3a4658" />
              <Text x={x + 6} y={95} w={26} fill={SOFT} />
            </g>
          ))}
        </>
      );
    case "news":
      return m ? (
        <>
          {[12, 106].map((x) => (
            <g key={x}>
              <Text x={x} y={14} w={22} h={6} fill="#3a4658" />
              {[30, 46, 62, 78, 94].map((y) => (
                <g key={y}>
                  <rect x={x} y={y} width={82} height={1} fill={LINE} />
                  <Text x={x} y={y + 6} w={34} />
                  <Text x={x + 70} y={y + 6} w={12} fill={SOFT} />
                </g>
              ))}
            </g>
          ))}
        </>
      ) : (
        <>
          <Heading variant={v} />
          {[10, 103].map((x) => (
            <g key={x}>
              <Box x={x} y={34} w={87} h={74} stroke r={7} />
              <Text x={x + 7} y={42} w={18} h={4} fill="#3a4658" />
              {[56, 72, 88].map((y) => (
                <g key={y}>
                  <Text x={x + 7} y={y} w={9} h={6} fill={MAIN} />
                  <Text x={x + 22} y={y} w={36} />
                  <circle cx={x + 78} cy={y + 3} r={3} fill={SOFT} />
                </g>
              ))}
            </g>
          ))}
        </>
      );
    case "visit":
      return m ? (
        <>
          <Box x={0} y={0} w={200} h={120} fill={MAIN} r={0} />
          <Text x={14} y={24} w={14} h={2} fill={ON_DARK} />
          <Text x={14} y={32} w={60} h={7} fill="#fff" />
          <Text x={14} y={44} w={46} h={7} fill="#fff" />
          <Text x={14} y={60} w={70} fill={ON_DARK} />
          <Text x={14} y={68} w={50} fill={ON_DARK} />
          <Box x={14} y={84} w={30} h={10} r={5} fill="#fff" />
          <Box x={48} y={84} w={28} h={10} r={5} fill="none" />
          <rect x={48.5} y={84.5} width={27} height={9} rx={4.5} fill="none" stroke={ON_DARK} />
          <Box x={108} y={18} w={80} h={84} r={5} fill="#dfe8dc" />
          <path d="M108 50h80M128 18v84M150 60h38M164 18v42" stroke="#fff" strokeWidth={2} />
          <circle cx={148} cy={58} r={4} fill="#e0533d" />
        </>
      ) : (
        <>
          <Box x={10} y={34} w={180} h={52} stroke r={10} />
          <Text x={22} y={44} w={14} h={2} fill="#8fb3dc" />
          <Text x={22} y={52} w={78} h={6} fill={MAIN} />
          <Text x={22} y={66} w={96} h={2.5} fill={SOFT} />
          <Box x={142} y={52} w={38} h={14} r={7} fill={MAIN} />
        </>
      );
    case "pastor": {
      const photoX = m ? 116 : 10;
      const textX = m ? 12 : 104;
      return (
        <>
          <Box x={photoX} y={14} w={m ? 72 : 82} h={92} r={m ? 3 : 8} fill={m ? SOFT : "#e3e8ef"} />
          <circle cx={photoX + (m ? 36 : 41)} cy={52} r={11} fill="#cfd6e0" />
          <path d={`M${photoX + (m ? 18 : 23)} 84a18 14 0 0 1 36 0z`} fill="#cfd6e0" />
          <Text x={textX} y={24} w={16} h={2} fill={m ? LINE : "#8fb3dc"} />
          <Text x={textX} y={31} w={m ? 48 : 30} h={6} fill={m ? "#3a4658" : MAIN} />
          {[48, 56, 64, 72, 80].map((y, i) => <Text key={y} x={textX} y={y} w={i === 4 ? 50 : 84} h={2.5} />)}
          <Box x={textX} y={92} w={30} h={9} r={4.5} stroke />
        </>
      );
    }
    case "gallery":
      return m ? (
        <>
          <Heading variant={v} />
          {[12, 74, 136].map((x) => (
            <g key={x}>
              <Box x={x} y={32} w={54} h={54} r={4} fill={IMG} />
              <Text x={x} y={92} w={38} h={3.5} fill="#3a4658" />
              <Text x={x} y={100} w={18} h={2.5} fill={SOFT} />
            </g>
          ))}
        </>
      ) : (
        <>
          <Heading variant={v} />
          {[10, 72, 134].map((x) => (
            <g key={x}>
              <Box x={x} y={34} w={56} h={74} stroke r={7} />
              <path d={`M${x + 7} ${34}h${42}a7 7 0 0 1 7 7v41h-56v-41a7 7 0 0 1 7-7z`} fill={IMG} />
              <Text x={x + 6} y={89} w={34} h={3.5} fill="#3a4658" />
              <Text x={x + 6} y={97} w={16} h={2.5} fill={SOFT} />
            </g>
          ))}
        </>
      );
  }
}

/** 섹션 디자인 모형. 크기는 감싸는 요소의 너비를 따른다(가로:세로 = 5:3). */
export function SectionDesignMock({ section, variant }: { section: HomeSectionKey; variant: SectionDesignId }) {
  return (
    <svg className="admin-section-mock" viewBox="0 0 200 120" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width={200} height={120} fill={variant === "modern" && section !== "quick" ? "#fff" : "#f6f8fb"} />
      {shapes(section, variant)}
    </svg>
  );
}
