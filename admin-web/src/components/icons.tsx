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

export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4.5h6a.75.75 0 0 1 .75.75V6a.75.75 0 0 1-.75.75H9A.75.75 0 0 1 8.25 6v-.75A.75.75 0 0 1 9 4.5Zm6.75.75h1.5A1.5 1.5 0 0 1 18.75 6.75v12A1.5 1.5 0 0 1 17.25 20.25H6.75A1.5 1.5 0 0 1 5.25 18.75v-12A1.5 1.5 0 0 1 6.75 5.25h1.5M9 11.25h6M9 14.25h6M9 17.25h3" />
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

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 21V4.5m0 0h11.25l-1.5 3.75 1.5 3.75H4.5" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.75v10.5m0 0 3.75-3.75M12 14.25l-3.75-3.75M4.5 17.25v1.5A1.5 1.5 0 0 0 6 20.25h12a1.5 1.5 0 0 0 1.5-1.5v-1.5" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** Faint up/down glyph for an inactive sortable header. */
export function ChevronUpDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    </svg>
  );
}

/** Active-sort arrow; rotate 180° for descending. */
export function ArrowUpIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function DeviceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8.25 3.75h7.5A1.5 1.5 0 0 1 17.25 5.25v13.5A1.5 1.5 0 0 1 15.75 20.25h-7.5A1.5 1.5 0 0 1 6.75 18.75V5.25A1.5 1.5 0 0 1 8.25 3.75Zm2.25 13.5h3" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function ArchiveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.75 6.75h16.5M4.5 6.75v11.25a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V6.75M4.5 6.75 6 3.75h12l1.5 3M9.75 11.25h4.5" />
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.25 6.75c0-.828.672-1.5 1.5-1.5h16.5c.828 0 1.5.672 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V6.75Zm1.5 0 8.25 6 8.25-6" />
    </svg>
  );
}

export function ReportIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8.25 6.75h7.5M8.25 12h7.5M8.25 17.25h4.5M6 3.75h12A1.5 1.5 0 0 1 19.5 5.25v13.5A1.5 1.5 0 0 1 18 20.25H6A1.5 1.5 0 0 1 4.5 18.75V5.25A1.5 1.5 0 0 1 6 3.75Z" />
    </svg>
  );
}

export function PrinterIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.75 8.25V4.5a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 .75.75v3.75M6.75 18.75H5.25a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5h13.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-1.5M6.75 14.25h10.5v6a.75.75 0 0 1-.75.75h-9a.75.75 0 0 1-.75-.75v-6Z" />
    </svg>
  );
}
