import type { NextConfig } from "next";

// 교회가 기존에 쓰던 외부 도메인을 온교회 홈페이지로 보내는 매핑.
// 도메인을 Vercel 프로젝트(Domains)에 추가하고 DNS(A/CNAME)를 Vercel로 연결해야 동작한다.
// 예전 사이트 경로는 온교회에 없으므로 경로와 상관없이 교회 홈 첫 화면으로 보낸다.
const DOMAIN_REDIRECTS: { hosts: string[]; destination: string }[] = [
  {
    hosts: ["salpyeo.com", "www.salpyeo.com"],
    destination: "https://onchurch.everychurch.co.kr/",
  },
];

const nextConfig: NextConfig = {
  async redirects() {
    return DOMAIN_REDIRECTS.flatMap(({ hosts, destination }) =>
      hosts.map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        destination,
        permanent: false,
      })),
    );
  },
};

export default nextConfig;
