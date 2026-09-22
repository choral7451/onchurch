import { headers } from "next/headers";
import { matchCustomDomain } from "@/lib/custom-domains";
import { isServiceHost, normalizeHostname } from "@/lib/host";

const ROOT_DOMAINS = ["everychurch.co.kr", "onchurch.kr"];

// 링크 앞에 붙일 경로 prefix. 서브도메인·자체 도메인 사이트는 ""(루트), 그 외에는 "/{tenant}".
export async function getPathPrefix(tenant: string): Promise<string> {
  const h = await headers();
  const host = normalizeHostname(h.get("host"));
  const isSubdomain =
    ROOT_DOMAINS.some((r) => host.endsWith(`.${r}`)) || host.endsWith(".localhost");
  if (isSubdomain) return "";
  // 자체 도메인에서 "/{tenant}" 를 붙이면 a.com/eunseok/about 처럼 링크가 깨진다.
  if (!isServiceHost(host) && (await matchCustomDomain(host))) return "";
  return `/${tenant}`;
}
