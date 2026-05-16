"use client";

import { useState, type DragEvent } from "react";

// 관리자 목록의 행을 드래그-앤-드롭으로 재정렬할 때 쓰는 hook.
// 호출 측에서 onReorder(from, to) 를 받아 applyReorder 등으로 서버에 반영하면 된다.
//
// 사용 예:
//   const { getItemProps, dragIndex, overIndex } = useDragSort(items, (f, t) => move(f, t));
//   items.map((it, idx) => (
//     <div {...getItemProps(idx)} className="row">
//       <span className="drag-handle" aria-hidden>≡</span>
//       ...
//     </div>
//   ))

type ItemProps = {
  draggable: true;
  onDragStart: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  "data-dragging"?: "";
  "data-drag-over"?: "";
};

export function useDragSort(
  itemCount: number,
  onReorder: (fromIndex: number, toIndex: number) => void,
) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function getItemProps(index: number): ItemProps {
    return {
      draggable: true,
      onDragStart: (e) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Firefox 호환: data 가 없으면 drag 가 시작되지 않을 수 있음.
        try { e.dataTransfer.setData("text/plain", String(index)); } catch { /* noop */ }
      },
      onDragOver: (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (overIndex !== index) setOverIndex(index);
      },
      onDragLeave: () => {
        // 행 밖으로 나가면 indicator 제거 (다른 행 onDragOver 가 다시 세팅)
        setOverIndex((cur) => (cur === index ? null : cur));
      },
      onDrop: (e) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== index && index >= 0 && index < itemCount) {
          onReorder(dragIndex, index);
        }
        setDragIndex(null);
        setOverIndex(null);
      },
      onDragEnd: () => {
        setDragIndex(null);
        setOverIndex(null);
      },
      ...(dragIndex === index ? { "data-dragging": "" as const } : {}),
      ...(overIndex === index && dragIndex !== null && dragIndex !== index
        ? { "data-drag-over": "" as const }
        : {}),
    };
  }

  return { getItemProps, dragIndex, overIndex };
}
