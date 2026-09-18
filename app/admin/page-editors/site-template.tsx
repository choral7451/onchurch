"use client";

import { SITE_TEMPLATE_META, DEFAULT_TEMPLATE_ID } from "@/components/templates/meta";

type Props = {
  value: string;
  saving: boolean;
  onChange: (next: string) => void;
};

// 공개 홈페이지 템플릿 선택. 목록은 템플릿 레지스트리 메타(SITE_TEMPLATE_META)에서 가져온다.
// '홈화면 구성' 화면 맨 위에 두는 이유: 템플릿에 따라 아래 '홈화면 순서'의 섹션 목록이 달라지므로
// (모던만 소식·갤러리 보유) 바꾼 결과가 같은 화면에서 바로 보인다.
export function SiteTemplateEditor({ value, saving, onChange }: Props) {
  const current = value || DEFAULT_TEMPLATE_ID;
  const known = SITE_TEMPLATE_META.some((t) => t.id === current);

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">HOME DESIGN</div>
        <h2>홈 디자인</h2>
        <p>홈페이지 전체 디자인을 고릅니다. 바꾸면 아래 홈화면 순서에 표시되는 섹션도 함께 달라집니다.</p>
      </div>

      <div className="admin-section-body">
        <div className="admin-template-grid">
          {SITE_TEMPLATE_META.map((t) => {
            const active = t.id === current;
            return (
              <button
                key={t.id}
                type="button"
                className={`admin-template-card ${active ? "active" : ""}`}
                aria-pressed={active}
                disabled={saving}
                onClick={() => onChange(t.id)}
              >
                <span className="admin-template-name">
                  {t.label}
                  {active && <span className="admin-template-badge">사용 중</span>}
                </span>
                <span className="admin-template-desc">{t.description}</span>
              </button>
            );
          })}
        </div>
        {!known && (
          <p className="admin-template-note">
            현재 설정된 템플릿(<code>{current}</code>)은 목록에 없는 값입니다. 위에서 하나를 고르면 교체됩니다.
          </p>
        )}
      </div>
    </section>
  );
}
