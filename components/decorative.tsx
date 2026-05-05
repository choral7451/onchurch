import type { CSSProperties } from "react";

type Props = { className?: string; style?: CSSProperties };

export function Rings({ className = "", style }: Props) {
  return (
    <svg className={className} style={style} viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="0.6" opacity="0.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <circle key={i} cx="300" cy="300" r={40 + i * 20} />
        ))}
      </g>
    </svg>
  );
}

export function LightRays({ className = "", style }: Props) {
  return (
    <svg className={className} style={style} viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ray-grad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g opacity="0.45">
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = -30 + i * 6;
          return (
            <rect key={i} x="395" y="-100" width="2" height="700" fill="url(#ray-grad)" transform={`rotate(${angle} 400 100)`} />
          );
        })}
      </g>
    </svg>
  );
}

export function Mesh({ className = "", style }: Props) {
  return (
    <svg className={className} style={style} viewBox="0 0 1200 600" fill="none" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="m1" cx="20%" cy="30%" r="40%">
          <stop offset="0%" stopColor="oklch(0.62 0.14 245)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.62 0.14 245)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="m2" cx="80%" cy="60%" r="40%">
          <stop offset="0%" stopColor="oklch(0.32 0.08 250)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(0.32 0.08 250)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="600" fill="url(#m1)" />
      <rect width="1200" height="600" fill="url(#m2)" />
    </svg>
  );
}

export function Dots({ className = "", style }: Props) {
  return (
    <svg className={className} style={style} viewBox="0 0 400 400" fill="none">
      <defs>
        <pattern id="dotpat" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.3" />
        </pattern>
      </defs>
      <rect width="400" height="400" fill="url(#dotpat)" />
    </svg>
  );
}
