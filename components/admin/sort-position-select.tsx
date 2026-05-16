"use client";

export function SortPositionSelect({
  index,
  total,
  onMove,
  disabled,
  ariaLabel,
}: {
  index: number;
  total: number;
  onMove: (newIndex: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  if (total <= 1) {
    return (
      <span className="sort-pos-static" aria-hidden>
        1 / 1
      </span>
    );
  }
  return (
    <label className="sort-pos-select" title="순서 변경">
      <span className="sort-pos-select-label">순서</span>
      <select
        value={index + 1}
        onChange={(e) => {
          const next = Number(e.target.value) - 1;
          if (Number.isFinite(next) && next !== index) onMove(next);
        }}
        disabled={disabled}
        aria-label={ariaLabel ?? "순서 변경"}
      >
        {Array.from({ length: total }, (_, i) => (
          <option key={i} value={i + 1}>
            {i + 1} / {total}
          </option>
        ))}
      </select>
    </label>
  );
}
