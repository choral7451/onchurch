"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearTokens,
  getCurrentUserId,
  getCurrentUserName,
  isLoggedIn,
  onchurchChurch,
  onchurchCommunity,
  type CommunityPost,
} from "@/lib/api-client";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function MyPageClient({ slug, loginHref, communityHref }: { slug: string; loginHref: string; communityHref: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState<string>("성도");
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    const ok = isLoggedIn();
    setLoggedIn(ok);
    if (!ok) { setReady(true); return; }
    setName(getCurrentUserName() ?? "성도");
    const myId = getCurrentUserId();
    (async () => {
      try {
        const res = await onchurchCommunity.listPublic(slug, { size: 100 });
        setMyPosts((res.posts ?? []).filter((p) => myId != null && p.authorId === myId));
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, [slug]);

  function logout() {
    clearTokens();
    router.push(communityHref);
    router.refresh();
  }

  if (!ready) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  if (!loggedIn) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: 20 }}>로그인이 필요합니다.</p>
        <Link href={loginHref} className="btn btn-primary">로그인 / 성도 가입</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card" style={{ padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>안녕하세요</div>
          <strong style={{ fontSize: 20 }}>{name} 님</strong>
        </div>
        <button type="button" className="btn btn-ghost" onClick={logout}>로그아웃</button>
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>내가 쓴 교제 글</h3>
        {myPosts.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            아직 작성한 글이 없습니다.{" "}
            <Link href={communityHref} style={{ color: "var(--accent)", fontWeight: 600 }}>교제 게시판으로 가기</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myPosts.map((p) => (
              <Link
                key={p.id}
                href={communityHref}
                className="card card-hover"
                style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {p.category && <span className="notice-cat">{p.category}</span>}
                  <strong style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</strong>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 12, flexShrink: 0 }}>{formatDate(p.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
