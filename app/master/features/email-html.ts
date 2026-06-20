import type { CSSProperties } from "react";

// 백엔드 buildHtml과 동일한 규칙으로 본문을 렌더링한다(미리보기/내역을 실제 발송과 일치시키기 위함).
//  - HTML 태그가 포함되면: 그대로 사용(줄바꿈 변환하지 않음)
//  - 일반 텍스트면: 줄바꿈만 <br/>로 변환
export function buildPreviewHtml(content: string): string {
  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(content);
  return looksLikeHtml ? content : content.replace(/\r\n/g, "\n").replace(/\n/g, "<br />");
}

// 백엔드 buildHtml 래퍼와 동일한 폰트/색상/줄간격.
export const EMAIL_BODY_STYLE: CSSProperties = {
  fontFamily: "'Apple SD Gothic Neo', sans-serif",
  fontSize: 15,
  lineHeight: 1.7,
  color: "#222",
};
