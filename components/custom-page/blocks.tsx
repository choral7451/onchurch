import Link from "next/link";
import { parseYouTubeId } from "@/lib/youtube";
import type { CustomPageBlock } from "@/lib/custom-page-blocks";
import { RichText, safeHref } from "@/components/custom-page/rich-text";

// 커스텀 페이지 본문 렌더러. 블록 배열을 위에서 아래로 그린다.
// 폭·정렬 같은 레이아웃 옵션은 클래스로만 반영해 템플릿 팔레트를 벗어나지 않게 한다.
export function CustomPageBlocks({ blocks }: { blocks: CustomPageBlock[] }) {
  return (
    <div className="cp-body">
      {blocks.map((b) => (
        <div key={b.id} className={`cp-block cp-${b.type}`}>
          <BlockView block={b} />
        </div>
      ))}
    </div>
  );
}

function BlockView({ block: b }: { block: CustomPageBlock }) {
  switch (b.type) {
    case "heading":
      return b.level === 3
        ? <h3 className={`cp-h3 al-${b.align}`}>{b.text}</h3>
        : <h2 className={`cp-h2 al-${b.align}`}>{b.text}</h2>;

    case "text":
      return <div className={`cp-text sz-${b.size} al-${b.align}`}><RichText text={b.text} /></div>;

    case "image": {
      if (b.urls.length === 0) return null;
      return (
        <figure className={`cp-figure w-${b.width}`}>
          <div className="cp-images" style={{ "--cp-cols": b.urls.length } as React.CSSProperties}>
            {b.urls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${url}-${i}`} src={url} alt={b.caption || ""} loading="lazy" />
            ))}
          </div>
          {b.caption.trim() && <figcaption>{b.caption}</figcaption>}
        </figure>
      );
    }

    case "video": {
      const id = parseYouTubeId(b.url);
      if (!id) return null;
      return (
        <figure className="cp-figure w-normal">
          <div className="cp-video">
            <iframe
              src={`https://www.youtube.com/embed/${id}`}
              title={b.caption || "영상"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
          {b.caption.trim() && <figcaption>{b.caption}</figcaption>}
        </figure>
      );
    }

    case "button": {
      const href = safeHref(b.href);
      if (!href || !b.label.trim()) return null;
      const external = !href.startsWith("/") && !href.startsWith("#");
      return (
        <div className={`cp-btn-wrap al-${b.align}`}>
          {external ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="cp-btn">{b.label}</a>
          ) : (
            <Link href={href} className="cp-btn">{b.label}</Link>
          )}
        </div>
      );
    }

    case "divider":
      return <hr className="cp-divider" />;
  }
}
