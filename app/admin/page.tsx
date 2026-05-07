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
        slug: "",
        brand: {
          name: "",
          eng: "",
          tagline: "",
          address: "",
          phone: "",
          email: "",
          representative: "",
          businessNo: "",
        },
        nav: SITE_DATA.nav.filter((n) => n.id !== "home"),
        worshipServices: SITE_DATA.worshipServices,
        worshipOrder: SITE_DATA.worshipOrder,
        notices: SITE_DATA.notices,
        noticeCategories: SITE_DATA.noticeCategories,
        events: SITE_DATA.events,
        pastor: SITE_DATA.pastor,
        vision: SITE_DATA.vision,
        history: SITE_DATA.history,
        staff: SITE_DATA.staff,
        transportation: SITE_DATA.transportation,
        galleries: SITE_DATA.galleries,
        galleryCategories: SITE_DATA.galleryCategories,
      }}
    />
  );
}
