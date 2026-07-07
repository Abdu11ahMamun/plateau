// Minimal inline icon set (heroicons-style, stroke=currentColor) so the panel
// stays self-contained with no icon dependency.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    fill: 'none',
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

export function BoardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 13.5h6V3.75H3v9.75Zm0 6.75h6v-3.75H3v3.75Zm12 0h6V10.5h-6v9.75Zm0-16.5v3.75h6V3.75h-6Z" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 19.5a6 6 0 0 0-12 0M18 19.5a5.25 5.25 0 0 0-3.9-5.07M9 10.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Zm6-1.5a3 3 0 1 0 0-6" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 5.25h15A1.5 1.5 0 0 1 21 6.75v12A1.5 1.5 0 0 1 19.5 20.25h-15A1.5 1.5 0 0 1 3 18.75v-12a1.5 1.5 0 0 1 1.5-1.5Z" />
    </svg>
  );
}

export function CashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.25 8.25h19.5M2.25 9v9a1.5 1.5 0 0 0 1.5 1.5h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v3Zm13.5 4.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15.75 9V5.25A1.5 1.5 0 0 0 14.25 3.75h-7.5A1.5 1.5 0 0 0 5.25 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V15M18 15l3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.25M19.5 12a7.5 7.5 0 0 1-12.9 5.25M16.5 6.75h3v-3M7.5 17.25h-3v3" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 6.75V12l3.75 2.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
