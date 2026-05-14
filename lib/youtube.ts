export function parseYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id && /^[\w-]{6,}$/.test(id) ? id : null;
      }
      const segs = u.pathname.split("/").filter(Boolean);
      if (segs[0] === "embed" || segs[0] === "shorts" || segs[0] === "live" || segs[0] === "v") {
        const id = segs[1];
        return id && /^[\w-]{6,}$/.test(id) ? id : null;
      }
    }
  } catch {
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  }
  return null;
}

export function youtubeThumbnail(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
}
