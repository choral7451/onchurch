type Props = {
  tagline: string;
};

export function UtilBar({ tagline }: Props) {
  return (
    <div className="utilbar">
      <div className="utilbar-inner">
        <div className="utilbar-left">
          <span>{tagline}</span>
        </div>
        <div className="utilbar-right">
          <a href="#">로그인</a>
          <span className="utilbar-divider" />
          <a href="#">교적 등록</a>
          <span className="utilbar-divider" />
          <a href="#">English</a>
        </div>
      </div>
    </div>
  );
}
