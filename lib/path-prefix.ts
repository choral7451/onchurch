import { headers } from "next/headers";

const ROOT_DOMAINS = ["everychurch.co.kr", "onchurch.kr"];

export async function getPathPrefix(tenant: string): Promise<string> {
  const h = await headers();
  const host = (h.get("host") ?? "").split(":")[0];
  const isSubdomain =
    ROOT_DOMAINS.some((r) => host.endsWith(`.${r}`)) || host.endsWith(".localhost");
  return isSubdomain ? "" : `/${tenant}`;
}
