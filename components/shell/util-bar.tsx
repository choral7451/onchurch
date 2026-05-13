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
        </div>
      </div>
    </div>
  );
}
