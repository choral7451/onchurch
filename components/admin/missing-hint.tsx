// 필수 칸이 비어 저장 버튼이 꺼져 있을 때, 버튼 옆에 무엇을 채워야 하는지 알려준다.
// fields: [표시 이름, 비어 있는지] — 비어 있는 것만 모아 보여주고, 다 채우면 사라진다.
export function MissingHint({ fields }: { fields: [label: string, missing: boolean][] }) {
  const labels = fields.filter(([, missing]) => missing).map(([label]) => label);
  if (labels.length === 0) return null;
  return (
    <span className="admin-missing-hint" role="status">
      {labels.join(", ")}을(를) 입력하면 저장할 수 있어요
    </span>
  );
}
