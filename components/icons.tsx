import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (size = 14): Pick<IconProps, "width" | "height" | "viewBox" | "fill" | "stroke" | "strokeWidth" | "strokeLinecap" | "strokeLinejoin"> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const Icon = {
  arrow: (p: IconProps = {}) => (
    <svg {...base(14)} {...p}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
  arrowDown: (p: IconProps = {}) => (
    <svg {...base(10)} strokeWidth={2.5} {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  search: (p: IconProps = {}) => (
    <svg {...base(18)} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  menu: (p: IconProps = {}) => (
    <svg {...base(20)} strokeLinejoin={undefined} {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  pin: (p: IconProps = {}) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  ),
  play: (p: IconProps = {}) => (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  calendar: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  wallet: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  ),
  cross: (p: IconProps = {}) => (
    <svg {...base(20)} strokeLinejoin={undefined} {...p}>
      <path d="M12 3v18M5 8h14" />
    </svg>
  ),
  bible: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <path d="M5 4v16a2 2 0 0 0 2 2h12V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
      <path d="M12 7v8M9 11h6" />
    </svg>
  ),
  pray: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <path d="M9 3v8l-4 4v6h14v-6l-4-4V3z" />
    </svg>
  ),
  heart: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  users: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  image: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  video: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  bell: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  building: (p: IconProps = {}) => (
    <svg {...base(20)} {...p}>
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  ),
  chevL: (p: IconProps = {}) => (
    <svg {...base(16)} {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  chevR: (p: IconProps = {}) => (
    <svg {...base(16)} {...p}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  download: (p: IconProps = {}) => (
    <svg {...base(14)} {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  ),
  share: (p: IconProps = {}) => (
    <svg {...base(14)} {...p}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  ),
  clock: (p: IconProps = {}) => (
    <svg {...base(14)} {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  mapPin: (p: IconProps = {}) => (
    <svg {...base(14)} {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  phone: (p: IconProps = {}) => (
    <svg {...base(14)} {...p}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  mail: (p: IconProps = {}) => (
    <svg {...base(14)} {...p}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  filter: (p: IconProps = {}) => (
    <svg {...base(14)} {...p}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
};

export type IconKey = keyof typeof Icon;
