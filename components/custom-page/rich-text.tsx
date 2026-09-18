import { Fragment, type ReactNode } from "react";
import Link from "next/link";

// 본문 블록의 인라인 서식: **굵게** 와 [라벨](주소) 만 지원한다.
// HTML 문자열을 만들지 않고 React 노드로 직접 조립하므로 sanitize가 필요 없다.
const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

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

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    if (m[1] !== undefined) {
      out.push(<strong key={`${keyPrefix}-b${i}`}>{m[1]}</strong>);
    } else {
      const href = safeHref(m[3] ?? "");
      out.push(
        href
          ? <InlineLink key={`${keyPrefix}-a${i}`} href={href}>{m[2]}</InlineLink>
          : (m[2] ?? ""),
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
