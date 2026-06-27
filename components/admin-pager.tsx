"use client";

// 관리자 목록용 간단 페이지네이션. 페이지가 1개 이하면 아무것도 그리지 않는다.
export function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  // 현재 페이지 주변으로 최대 5개 번호만 노출.
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(pageCount, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  const btn = (label: string, target: number, disabled: boolean, active = false) => (
    <button
      key={`${label}-${target}`}
      type="button"
      onClick={() => onChange(target)}
      disabled={disabled}
      style={{
        minWidth: 34,
        height: 34,
        padding: "0 10px",
        borderRadius: "var(--r-sm)",
        border: `1px solid ${active ? "var(--primary)" : "var(--line)"}`,
        background: active ? "color-mix(in oklch, var(--primary) 12%, var(--surface))" : "var(--surface)",
        color: disabled ? "var(--muted-2)" : active ? "var(--primary-deep)" : "var(--ink)",
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        fontFamily: "inherit",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
      {btn("‹", page - 1, page <= 1)}
      {start > 1 && (
        <>
          {btn("1", 1, false, page === 1)}
          {start > 2 && <span style={{ color: "var(--muted-2)", padding: "0 2px" }}>…</span>}
        </>
      )}
      {pages.map((p) => btn(String(p), p, false, p === page))}
      {end < pageCount && (
        <>
          {end < pageCount - 1 && <span style={{ color: "var(--muted-2)", padding: "0 2px" }}>…</span>}
          {btn(String(pageCount), pageCount, false, page === pageCount)}
        </>
      )}
      {btn("›", page + 1, page >= pageCount)}
    </div>
  );
}
