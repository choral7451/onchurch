// 외부 동영상 링크(YouTube/Vimeo)를 임베드용 URL로 변환한다.
// 변환 불가하면 null (원본 링크로 안내).
export function toEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url) return null;

  // YouTube
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}`;

  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}

// 동영상 링크에서 썸네일 이미지 URL을 만든다. (YouTube만 URL로 도출 가능, 그 외는 null)
export function toVideoThumbnailUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt?.[1]) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
}
