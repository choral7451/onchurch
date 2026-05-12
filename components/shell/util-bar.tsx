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
      </div>
    </div>
  );
}
