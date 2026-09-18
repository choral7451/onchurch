import { Fragment, type ReactNode } from "react";
import Link from "next/link";

// 본문 블록의 인라인 서식: **굵게**, ++크게++, --작게--, [라벨](주소) 를 지원한다.
// HTML 문자열을 만들지 않고 React 노드로 직접 조립하므로 sanitize가 필요 없다.
const INLINE = /\*\*([^*]+)\*\*|\+\+([^+]+)\+\+|--([^-]+)--|\[([^\]]+)\]\(([^)\s]+)\)/g;

// 서식 안의 서식(++큰 **굵은** 글자++)까지 읽으려면 재귀가 필요하다.
// 입력이 이상해도 무한히 파고들지 않도록 깊이를 제한한다.
const MAX_DEPTH = 4;

// javascript: 같은 실행 가능한 스킴을 막는다. 상대경로와 흔한 안전 스킴만 통과시킨다.
export function safeHref(raw: string): string | null {
  const href = (raw ?? "").trim();
  if (!href) return null;
  if (href.startsWith("/") || href.startsWith("#")) return href;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return href;
  // 스킴이 없으면 외부 주소로 보고 https를 붙인다 (church.com 처럼 입력하는 경우).
  if (/^[\w-]+(\.[\w-]+)+/.test(href)) return `https://${href}`;
  return null;
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  const external = !href.startsWith("/") && !href.startsWith("#");
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="cp-link">{children}</a>
  ) : (
    <Link href={href} className="cp-link">{children}</Link>
  );
}

function renderInline(text: string, keyPrefix: string, depth = 0): ReactNode[] {
  const out: ReactNode[] = [];
  if (depth >= MAX_DEPTH) return [text];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${keyPrefix}-${i}`;
    if (m[1] !== undefined) {
      out.push(<strong key={key}>{renderInline(m[1], key, depth + 1)}</strong>);
    } else if (m[2] !== undefined) {
      out.push(<span key={key} className="cp-lg">{renderInline(m[2], key, depth + 1)}</span>);
    } else if (m[3] !== undefined) {
      out.push(<span key={key} className="cp-sm">{renderInline(m[3], key, depth + 1)}</span>);
    } else {
      const href = safeHref(m[5] ?? "");
      out.push(
        href
          ? <InlineLink key={key} href={href}>{renderInline(m[4] ?? "", key, depth + 1)}</InlineLink>
          : (m[4] ?? ""),
      );
    }
    last = at + m[0].length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// 빈 줄로 문단을 나누고, 문단 안의 줄바꿈은 그대로 유지한다.
// '- '로 시작하는 줄이 이어지면 목록으로 묶는다.
export function RichText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <>
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("- "));
        if (isList) {
          return (
            <ul key={pi} className="cp-list">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.trim().slice(2), `p${pi}l${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={pi} className="cp-para">
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l, `p${pi}l${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
