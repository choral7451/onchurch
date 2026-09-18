// 커스텀 페이지 본문 블록. 서버는 jsonb 배열로 그대로 보관만 하고 해석하지 않으므로,
// 지원 타입과 옵션의 단일 소스는 이 파일이다.
//
// HTML이 아니라 구조화된 블록으로 다루는 이유:
//  - 공개 사이트에서 dangerouslySetInnerHTML을 쓰지 않아도 되어 XSS 대응이 필요 없다
//  - 블록마다 템플릿 CSS를 입히므로 교회별로 디자인이 제각각이 되지 않는다
//  - 세로 흐름이 강제되어 모바일 레이아웃이 자동으로 맞는다

export type BlockWidth = "normal" | "wide" | "full";
export type BlockAlign = "left" | "center";
// 글자 단위가 아니라 블록 단위 크기 — 글자마다 크기를 열면 템플릿 타이포가 무너진다.
export type BlockSize = "sm" | "md" | "lg";

export type CustomPageBlock =
  | { id: string; type: "heading"; text: string; level: 2 | 3; align: BlockAlign }
  | { id: string; type: "text"; text: string; align: BlockAlign; size: BlockSize }
  | { id: string; type: "image"; urls: string[]; caption: string; width: BlockWidth }
  | { id: string; type: "video"; url: string; caption: string }
  | { id: string; type: "button"; label: string; href: string; align: BlockAlign }
  | { id: string; type: "divider" };

export type BlockType = CustomPageBlock["type"];

export const BLOCK_LABELS: Record<BlockType, { title: string; desc: string }> = {
  heading: { title: "제목", desc: "소제목으로 단락을 나눕니다" },
  text: { title: "본문", desc: "여러 줄 텍스트. 툴바로 굵게·링크·목록을 넣습니다" },
  image: { title: "이미지", desc: "사진 1~3장을 나란히 배치" },
  video: { title: "영상", desc: "유튜브 주소를 붙여넣으면 재생됩니다" },
  button: { title: "버튼", desc: "다른 페이지나 외부 링크로 이동" },
  divider: { title: "구분선", desc: "가로선으로 영역을 나눕니다" },
};

export const BLOCK_ORDER: BlockType[] = ["heading", "text", "image", "video", "button", "divider"];

function newId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createBlock(type: BlockType): CustomPageBlock {
  switch (type) {
    case "heading":
      return { id: newId(), type, text: "", level: 2, align: "left" };
    case "text":
      return { id: newId(), type, text: "", align: "left", size: "md" };
    case "image":
      return { id: newId(), type, urls: [], caption: "", width: "normal" };
    case "video":
      return { id: newId(), type, url: "", caption: "" };
    case "button":
      return { id: newId(), type, label: "", href: "", align: "left" };
    case "divider":
      return { id: newId(), type };
  }
}

// 서버에서 받은 임의의 JSON을 안전한 블록 배열로 좁힌다.
// 모르는 타입이나 망가진 항목은 조용히 버려서, 옛 데이터나 신규 블록 타입 때문에 페이지 전체가 깨지지 않게 한다.
export function normalizeBlocks(raw: unknown): CustomPageBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomPageBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const id = typeof b.id === "string" && b.id ? b.id : newId();
    const align: BlockAlign = b.align === "center" ? "center" : "left";
    switch (b.type) {
      case "heading":
        out.push({ id, type: "heading", text: String(b.text ?? ""), level: b.level === 3 ? 3 : 2, align });
        break;
      case "text":
        out.push({ id, type: "text", text: String(b.text ?? ""), align, size: b.size === "sm" || b.size === "lg" ? b.size : "md" });
        break;
      case "image": {
        const urls = Array.isArray(b.urls) ? b.urls.filter((u): u is string => typeof u === "string").slice(0, 3) : [];
        const width: BlockWidth = b.width === "wide" || b.width === "full" ? b.width : "normal";
        out.push({ id, type: "image", urls, caption: String(b.caption ?? ""), width });
        break;
      }
      case "video":
        out.push({ id, type: "video", url: String(b.url ?? ""), caption: String(b.caption ?? "") });
        break;
      case "button":
        out.push({ id, type: "button", label: String(b.label ?? ""), href: String(b.href ?? ""), align });
        break;
      case "divider":
        out.push({ id, type: "divider" });
        break;
      default:
        break;
    }
  }
  return out;
}

// 내용이 비어 저장할 의미가 없는 블록을 걸러낸다(빈 블록이 공개 페이지에 빈 자리로 남지 않도록).
export function isBlockEmpty(b: CustomPageBlock): boolean {
  switch (b.type) {
    case "heading":
    case "text":
      return !b.text.trim();
    case "image":
      return b.urls.length === 0;
    case "video":
      return !b.url.trim();
    case "button":
      return !b.label.trim() || !b.href.trim();
    case "divider":
      return false;
  }
}

// 한글 제목에서 URL 주소를 만들 수 없으므로, 영문/숫자만 남겨 제안값을 만든다.
// 남는 게 없으면 빈 문자열을 돌려주고 사용자가 직접 입력하게 한다.
export function suggestSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
}

// 주소(slug)를 제목 위 영문 eyebrow로 되돌린다. .eyebrow가 uppercase로 렌더하므로
// 영문 이름을 따로 저장하지 않아도 표시상 손실이 없다. (vision → VISION, our-vision → OUR VISION)
export function engFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").trim().toUpperCase();
}
