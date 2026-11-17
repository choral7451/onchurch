"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, onchurchCommunity, type CommunityComment } from "@/lib/api-client";
import { type Lang, pick } from "@/lib/i18n";

type Props = {
  slug: string;
  postId: number;
  loggedIn: boolean;
  myId: number | null;
  loginHref: string;
  lang: Lang;
  // 댓글 수가 바뀌면 목록 카드의 숫자도 맞춘다.
  onCountChange: (count: number) => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd} ${hh}:${mi}`;
}

// 게시글 상세 모달 안의 댓글 영역 — 목록 + 입력(로그인 시) + 본인 댓글 삭제.
export function CommunityComments({ slug, postId, loggedIn, myId, loginHref, lang, onCountChange }: Props) {
  const t = pick(lang, {
    ko: {
      title: "댓글",
      loading: "불러오는 중...",
      empty: "첫 댓글을 남겨보세요.",
      placeholder: "따뜻한 한마디를 남겨주세요.",
      submit: "등록",
      saving: "등록 중...",
      loginToComment: "로그인하고 댓글 남기기",
      del: "삭제",
      confirmDelete: "이 댓글을 삭제할까요?",
      saveFail: "댓글 등록에 실패했습니다.",
      deleteFail: "댓글 삭제에 실패했습니다.",
    },
    en: {
      title: "Comments",
      loading: "Loading...",
      empty: "Be the first to comment.",
      placeholder: "Leave a kind word.",
      submit: "Post",
      saving: "Posting...",
      loginToComment: "Log in to comment",
      del: "Delete",
      confirmDelete: "Delete this comment?",
      saveFail: "Failed to post the comment.",
      deleteFail: "Failed to delete the comment.",
    },
  });

  const [comments, setComments] = useState<CommunityComment[] | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    onchurchCommunity
      .listComments(slug, postId)
      .then((list) => {
        if (cancelled) return;
        setComments(list);
        onCountChange(list.length);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
    // onCountChange 는 부모의 setState 래퍼라 매 렌더 바뀌므로 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, postId]);

  async function submit() {
    const content = text.trim();
    if (!content || saving) return;
    setSaving(true);
    setErr("");
    try {
      const created = await onchurchCommunity.createComment(postId, content);
      setComments((prev) => {
        const next = [...(prev ?? []), created];
        onCountChange(next.length);
        return next;
      });
      setText("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t.saveFail);
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: CommunityComment) {
    if (!confirm(t.confirmDelete)) return;
    try {
      await onchurchCommunity.removeComment(c.id);
      setComments((prev) => {
        const next = (prev ?? []).filter((x) => x.id !== c.id);
        onCountChange(next.length);
        return next;
      });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : t.deleteFail);
    }
  }

  return (
    <div className="cmt">
      <div className="cmt-head">
        <strong>{t.title}</strong>
        {comments && comments.length > 0 && <span className="cmt-count">{comments.length}</span>}
      </div>

      {comments === null ? (
        <p className="cmt-empty">{t.loading}</p>
      ) : comments.length === 0 ? (
        <p className="cmt-empty">{t.empty}</p>
      ) : (
        <ul className="cmt-list">
          {comments.map((c) => (
            <li key={c.id} className="cmt-item">
              <div className="cmt-meta">
                <span className="cmt-author">{c.authorName}</span>
                <span className="cmt-date">{formatDate(c.createdAt)}</span>
                {myId != null && myId === c.authorId && (
                  <button type="button" className="cmt-del" onClick={() => remove(c)}>{t.del}</button>
                )}
              </div>
              <p className="cmt-body">{c.content}</p>
            </li>
          ))}
        </ul>
      )}

      {loggedIn ? (
        <form
          className="cmt-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <textarea
            value={text}
            maxLength={1000}
            rows={2}
            placeholder={t.placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Cmd/Ctrl+Enter 로 바로 등록
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={saving || !text.trim()}>
            {saving ? t.saving : t.submit}
          </button>
        </form>
      ) : (
        <Link href={loginHref} className="btn btn-secondary cmt-login">{t.loginToComment}</Link>
      )}
      {err && <p className="cmt-err">{err}</p>}
    </div>
  );
}
