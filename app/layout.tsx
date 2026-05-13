import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { AuthBootstrap } from "@/components/shell/auth-bootstrap";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://everychurch.co.kr"),
  title: {
    default: "온교회 — 교회 홈페이지 만들기 · 5분이면 완성되는 빌더",
    template: "%s | 온교회",
  },
  description:
    "복잡한 디자인·코딩 없이 5분이면 완성되는 교회 홈페이지 빌더. 예배 안내, 설교 영상, 주보 PDF, 공지, 갤러리, 통독, 부서까지 — 처음부터 교회를 위해 설계된 9종 페이지를 ON/OFF 토글로 운영하세요. 월 1만원, 7일 무료 체험.",
  applicationName: "온교회",
  generator: "Next.js",
  keywords: [
    "교회 홈페이지",
    "교회 홈페이지 만들기",
    "교회 홈페이지 제작",
    "교회 홈페이지 빌더",
    "교회 홈페이지 템플릿",
    "교회 사이트",
    "교회 웹사이트",
    "작은 교회 홈페이지",
    "예배 안내 홈페이지",
    "설교 영상 홈페이지",
    "주보 PDF",
    "교회 공지사항",
    "교회 갤러리",
    "성경 통독",
    "교회 부서 홈페이지",
    "기도 요청 폼",
    "교회 서브도메인",
    "온교회",
    "everychurch",
  ],
  authors: [{ name: "온교회" }],
  creator: "온교회",
  publisher: "온교회",
  category: "Religion",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://everychurch.co.kr",
    siteName: "온교회",
    title: "온교회 — 교회 홈페이지 만들기 · 5분이면 완성되는 빌더",
    description:
      "코딩 없이 우리 교회 이름과 콘텐츠를 그대로 담은 홈페이지. 예배·설교·주보·공지·갤러리·통독·부서까지 한 번에. 월 1만원, 7일 무료 체험.",
  },
  twitter: {
    card: "summary_large_image",
    title: "온교회 — 교회 홈페이지 빌더",
    description: "5분이면 완성되는 우리 교회 홈페이지. 월 1만원, 7일 무료 체험.",
  },
  icons: { icon: "/favicon.ico" },
  verification: {
    other: {
      "naver-site-verification": "3d0a8523edc2dafbb1a456be187f29abb9184714",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${interTight.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}
