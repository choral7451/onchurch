// 관리자 페이지에서 sortOrder 가 있는 목록을 드래그/select 로 재정렬할 때 쓰는 헬퍼.
// - reorderArray: 배열을 fromIndex -> toIndex 로 이동시킨 새 배열을 반환
// - applyReorder: 새 인덱스 = 새 sortOrder 로 보고, 값이 달라진 아이템만 update API 호출

export function reorderArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items;
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export async function applyReorder<T extends { id: number; sortOrder: number }>(
  items: T[],
  fromIndex: number,
  toIndex: number,
  updateOne: (item: T, nextSortOrder: number) => Promise<unknown>,
): Promise<void> {
  if (fromIndex === toIndex) return;
  const next = reorderArray(items, fromIndex, toIndex);
  for (let i = 0; i < next.length; i += 1) {
    if (next[i].sortOrder !== i) {
      await updateOne(next[i], i);
    }
  }
}
