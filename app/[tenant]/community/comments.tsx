"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  // 내가 차단한 성도 — 그 사람의 댓글은 보여주지 않는다.
  blockedIds: Set<number>;
  onBlock: (userId: number, name: string) => void;
};

// 방금 · 5분 전 · 3시간 전 · 어제 · 2026.11.20 (올해가 아니면 연도까지)
function formatWhen(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return pick(lang, { ko: "방금", en: "just now" });
  if (diff < 3600) return pick(lang, { ko: `${Math.floor(diff / 60)}분 전`, en: `${Math.floor(diff / 60)}m ago` });
  if (diff < 86400) return pick(lang, { ko: `${Math.floor(diff / 3600)}시간 전`, en: `${Math.floor(diff / 3600)}h ago` });
  if (diff < 172800) return pick(lang, { ko: "어제", en: "yesterday" });
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() === new Date().getFullYear() ? `${mm}.${dd}` : `${d.getFullYear()}.${mm}.${dd}`;
}

const MAX_LEN = 1000;
// 게시글 상세 모달 안의 댓글 영역 — 목록 + 입력(로그인 시) + 본인 댓글 삭제.
export function CommunityComments({ slug, postId, loggedIn, myId, loginHref, lang, onCountChange, blockedIds, onBlock }: Props) {
  const t = pick(lang, {
    ko: {
      title: "댓글",
      loading: "불러오는 중...",
      empty: "아직 댓글이 없어요. 첫 마음을 나눠 주세요.",
      placeholder: "따뜻한 한마디를 남겨주세요",
      submit: "등록",
      saving: "등록 중...",
      loginToComment: "로그인하고 댓글 남기기",
      del: "삭제",
      block: "차단",
      confirmDelete: "이 댓글을 삭제할까요?",
      saveFail: "댓글 등록에 실패했습니다.",
      deleteFail: "댓글 삭제에 실패했습니다.",
    },
    en: {
      title: "Comments",
      loading: "Loading...",
      empty: "No comments yet. Be the first to share.",
      placeholder: "Leave a kind word.",
      submit: "Post",
      saving: "Posting...",
      loginToComment: "Log in to comment",
      del: "Delete",
      block: "Block",
      confirmDelete: "Delete this comment?",
      saveFail: "Failed to post the comment.",
      deleteFail: "Failed to delete the comment.",
    },
  });

  const [comments, setComments] = useState<CommunityComment[] | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listEndRef = useRef<HTMLLIElement>(null);

  // 입력 줄 수에 맞춰 높이를 늘린다(최대 높이는 CSS).
  function autoSize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

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
      requestAnimationFrame(() => {
        autoSize();
        listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
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

  const visible = comments?.filter((c) => !blockedIds.has(c.authorId)) ?? null;

  return (
    <div className="cmt">
      <div className="cmt-head">
        <strong>{t.title}</strong>
        {visible && visible.length > 0 && <span className="cmt-count">{visible.length}</span>}
      </div>

      {visible === null ? (
        <p className="cmt-empty">{t.loading}</p>
      ) : visible.length === 0 ? (
        <p className="cmt-empty">{t.empty}</p>
      ) : (
        <ul className="cmt-list">
          {visible.map((c, i) => {
            const mine = myId != null && myId === c.authorId;
            return (
              <li key={c.id} className="cmt-item" ref={i === visible.length - 1 ? listEndRef : undefined}>
                <span className={`cmt-avatar ${mine ? "mine" : ""}`} aria-hidden="true">{(c.authorName || "?").slice(0, 1)}</span>
                <div className="cmt-main">
                  <div className="cmt-meta">
                    <span className="cmt-author">{c.authorName}</span>
                    <time className="cmt-date" dateTime={c.createdAt}>{formatWhen(c.createdAt, lang)}</time>
                    {mine ? (
                      <button type="button" className="cmt-action" onClick={() => remove(c)}>{t.del}</button>
                    ) : (
                      loggedIn && <button type="button" className="cmt-action" onClick={() => onBlock(c.authorId, c.authorName)}>{t.block}</button>
                    )}
                  </div>
                  <p className="cmt-body">{c.content}</p>
                </div>
              </li>
            );
          })}
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
            ref={inputRef}
            value={text}
            maxLength={MAX_LEN}
            rows={1}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            onChange={(e) => {
              setText(e.target.value);
              autoSize();
            }}
            onKeyDown={(e) => {
              // Cmd/Ctrl+Enter 로 바로 등록
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
            }}
          />
          <button type="submit" className="cmt-send" disabled={saving || !text.trim()} aria-label={saving ? t.saving : t.submit}>
            {saving ? (
              <span className="cmt-spinner" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}
          </button>
        </form>
      ) : (
        <Link href={loginHref} className="cmt-form cmt-login">
          <span>{t.loginToComment}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      )}
      {text.length > MAX_LEN - 100 && <p className="cmt-limit">{text.length} / {MAX_LEN}</p>}
      {err && <p className="cmt-err" role="alert">{err}</p>}
    </div>
  );
}
