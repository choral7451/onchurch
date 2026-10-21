import { siteColorVars, type SiteDesignColors } from "@/lib/site-design";

// 교회가 고른 메인·포인트 색을 공개 사이트 전체(.app)의 CSS 변수로 덮어쓴다.
// 색 미설정이면 아무것도 렌더하지 않으므로 기존 교회의 화면은 그대로다.
// 레이아웃(저장값)과 홈 미리보기(초안)가 각각 하나씩 렌더할 수 있고, 뒤에 오는 쪽(미리보기)이 이긴다.
export function SiteColorStyle({ colors }: { colors: SiteDesignColors | null | undefined }) {
  if (!colors) return null;
  const vars = siteColorVars(colors);
  const body = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
  return <style dangerouslySetInnerHTML={{ __html: `.app{${body}}` }} />;
}
