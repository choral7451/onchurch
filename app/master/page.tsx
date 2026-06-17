import type { Metadata } from "next";
import { MasterApp } from "./master-app";

export const metadata: Metadata = {
  title: "마스터 콘솔 — 온교회",
  description: "온교회 마스터 전용",
  robots: { index: false, follow: false },
};

export default function MasterPage() {
  return <MasterApp />;
}
