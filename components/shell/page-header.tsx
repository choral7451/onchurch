import { Rings } from "@/components/decorative";

type Props = {
  eyebrow: string;
  title: string;
  sub?: string;
};

export function PageHeader({ eyebrow, title, sub }: Props) {
  return (
    <section className="page-header">
      <Rings className="bg-rings" style={{ width: 480, height: 480, top: -120, right: -120, color: "var(--primary)" }} />
      <div className="page-header-inner">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
    </section>
  );
}
