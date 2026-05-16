"use client";

export function DragHandle({ disabled, title }: { disabled?: boolean; title?: string }) {
  return (
    <span
      className={`drag-handle ${disabled ? "disabled" : ""}`}
      title={title ?? "드래그해서 순서를 바꾸세요"}
      aria-hidden="true"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="5" cy="3" r="1.1" fill="currentColor" />
        <circle cx="5" cy="7" r="1.1" fill="currentColor" />
        <circle cx="5" cy="11" r="1.1" fill="currentColor" />
        <circle cx="9" cy="3" r="1.1" fill="currentColor" />
        <circle cx="9" cy="7" r="1.1" fill="currentColor" />
        <circle cx="9" cy="11" r="1.1" fill="currentColor" />
      </svg>
    </span>
  );
}
