import Link from "next/link";

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
          <Link href="/login">로그인</Link>
          <span className="utilbar-divider" />
          <a href="#">교적 등록</a>
          <span className="utilbar-divider" />
          <a href="#">English</a>
        </div>
      </div>
    </div>
  );
}
