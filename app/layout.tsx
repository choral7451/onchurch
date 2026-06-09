import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { AuthBootstrap } from "@/components/shell/auth-bootstrap";
import { resolveHost } from "@/lib/seo";
import "./globals.css";

// Google Analytics — 서비스 랜딩 도메인(everychurch.co.kr)에서만 로드. 교회 서브도메인 제외.
const GA_MEASUREMENT_ID = "G-K9XZMTLYRB";

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
    default: "온교회 — 교회 홈페이지 제작·만들기 5분 빌더",
    template: "%s | 온교회",
  },
  description: "교회 홈페이지 제작, 코딩 없이 5분이면 완성되는 빌더. 월 1만원, 7일 무료 체험.",
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
    title: "온교회 — 교회 홈페이지 제작·만들기 5분 빌더",
    description: "교회 홈페이지 제작, 코딩 없이 5분이면 완성. 월 1만원, 7일 무료 체험.",
    images: [
      { url: "/everychurch-logo.jpeg", width: 2048, height: 2048, alt: "온교회" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "온교회 — 교회 홈페이지 제작 빌더",
    description: "교회 홈페이지 제작, 코딩 없이 5분이면 완성. 월 1만원, 7일 무료.",
    images: ["/everychurch-logo.jpeg"],
  },
  icons: {
    icon: [
      { url: "/everychurch-logo.jpeg", type: "image/jpeg" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/everychurch-logo.jpeg", type: "image/jpeg" }],
    shortcut: ["/everychurch-logo.jpeg"],
  },
  verification: {
    other: {
      "naver-site-verification": [
        "3d0a8523edc2dafbb1a456be187f29abb9184714",
        "949380f4f1a8e733adce94a80ed2bbcc662638ae",
        "6c31034705898e50ba2760b4ed0b1e43d5874243",
        "1f205ed6c2494744b4434cd172a40d4e3778cb10",
      ],
    },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { kind } = await resolveHost();
  const isLanding = kind === "root";
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
        {isLanding && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
