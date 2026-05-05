import type { Metadata } from "next";
import { SITE_DATA } from "@/lib/site-data";
import { AdminApp } from "./admin-app";

export const metadata: Metadata = {
  title: "관리자 콘솔 — 온교회",
  description: "교회 홈페이지 관리자",
};

export default function AdminPage() {
  return (
    <AdminApp
      initial={{
        slug: "sungdong",
        brand: SITE_DATA.brand,
        nav: SITE_DATA.nav.filter((n) => n.id !== "home"),
      }}
    />
  );
}
