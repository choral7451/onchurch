"use client";

// 페이지당 개수 선택 드롭다운(목록 상단에 배치).
export function PageSizeSelect({
  pageSize,
  onChange,
  options = [10, 30, 50],
}: {
  pageSize: number;
  onChange: (size: number) => void;
  options?: number[];
}) {
  return (
    <select
      value={pageSize}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="페이지당 개수"
      className="admin-pager-size"
      style={{
        height: 34,
        padding: "0 8px",
        borderRadius: 999,
        border: "1px solid var(--line)",
        background: "var(--surface)",
        color: "var(--ink)",
        fontSize: 13,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {options.map((n) => (
        <option key={n} value={n}>{n}개씩</option>
      ))}
    </select>
  );
}

// 관리자 목록용 간단 페이지네이션(번호 클릭형).
export function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount < 1) return null;

  // 현재 페이지 주변으로 최대 5개 번호만 노출.
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(pageCount, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  // 페이지 이동 시 목록 상단이 보이도록 맨 위로 스크롤.
  const go = (target: number) => {
    onChange(target);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const btn = (label: string, target: number, disabled: boolean, active = false, cls = "") => (
    <button
      key={`${label}-${target}`}
      type="button"
      onClick={() => go(target)}
      disabled={disabled}
      className={`admin-pager-btn ${cls}`.trim()}
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
    <div className="admin-pager">
      {btn("‹", page - 1, page <= 1, false, "admin-pager-arrow")}
      {/* 데스크톱: 번호 클릭형 / 모바일(CSS): 번호는 숨기고 '현재/전체'만 표시 */}
      <div className="admin-pager-nums">
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
      </div>
      <span className="admin-pager-status" aria-hidden="true">{page} / {pageCount}</span>
      {btn("›", page + 1, page >= pageCount, false, "admin-pager-arrow")}
    </div>
  );
}
