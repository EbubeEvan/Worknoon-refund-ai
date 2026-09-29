import type { ReactNode, SVGProps } from "react";

/**
 * Inline icon set.
 *
 * Deliberately hand-rolled rather than pulled from a package: the app needs
 * twenty glyphs, they change rarely, and an icon library is a lot of bundle for
 * a support desk. Every icon inherits `currentColor`, so it takes the colour of
 * the text it sits inside.
 */

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Tailwind size class. Defaults to the caller's font size. */
  size?: string;
  children?: ReactNode;
};

function Icon({ size, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
      className={size ?? "size-4"}
    >
      {children}
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9.5-4.1-1.6-7-5.3-7-9.5V6l7-3z" />
      <path d="M9.2 12.2l2 2 3.6-3.8" />
    </Icon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.2l1.5 4.1 4.1 1.5-4.1 1.5L12 15.4l-1.5-4.1-4.1-1.5 4.1-1.5L12 4.2z" />
      <path d="M18 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z" />
    </Icon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />
    </Icon>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.9" />
    </Icon>
  );
}

export function XCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.3 9.3l5.4 5.4M14.7 9.3l-5.4 5.4" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.4V12l3 1.8" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v5M12 7.9h.01" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.7 4.3L3.4 17.2a1.6 1.6 0 0 0 1.4 2.4h14.4a1.6 1.6 0 0 0 1.4-2.4L13.3 4.3a1.6 1.6 0 0 0-2.6 0z" />
      <path d="M12 9.6v4M12 16.6h.01" />
    </Icon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 20.5V4.2M5.5 5.2h11l-1.8 3.6 1.8 3.6h-11" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 9.5l5.5 5 5.5-5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 6l5.5 6-5.5 6" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.5h15M13.5 6.5l6 6-6 6" />
    </Icon>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.2l7.5 3.9v9.8L12 20.8l-7.5-3.9V7.1L12 3.2z" />
      <path d="M4.5 7.1L12 11l7.5-3.9M12 11v9.8" />
    </Icon>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 13.5h4l1.5 3h6l1.5-3h4" />
      <path d="M6.2 4.5h11.6l2.7 9v4.4a1.6 1.6 0 0 1-1.6 1.6H5.1a1.6 1.6 0 0 1-1.6-1.6V13.5l2.7-9z" />
    </Icon>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.5 3.5H7.4A1.9 1.9 0 0 0 5.5 5.4v13.2a1.9 1.9 0 0 0 1.9 1.9h9.2a1.9 1.9 0 0 0 1.9-1.9V8.5l-5-5z" />
      <path d="M13.2 3.6v4.8h5M9 13h6M9 16.5h4" />
    </Icon>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 15.5V4.2M8 7.8L12 3.8l4 4" />
      <path d="M4.5 14.5v3.9a1.9 1.9 0 0 0 1.9 1.9h11.2a1.9 1.9 0 0 0 1.9-1.9v-3.9" />
    </Icon>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5l8.5 4.3-8.5 4.3-8.5-4.3L12 3.5z" />
      <path d="M3.5 12.2l8.5 4.3 8.5-4.3M3.5 16.4l8.5 4.3 8.5-4.3" />
    </Icon>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1L3.5 8.4" />
      <path d="M3.5 4.4v4h4M12 7.6V12l3.1 1.9" />
    </Icon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h16" />
      <path d="M7.5 20v-6.5M12 20V6.5M16.5 20v-9.5" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9.5" cy="8.5" r="3.2" />
      <path d="M3.8 19.4a5.9 5.9 0 0 1 11.4 0" />
      <path d="M16.4 6.2a3.2 3.2 0 0 1 0 6M17.6 14.6a5.9 5.9 0 0 1 2.6 4.8" />
    </Icon>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 7.5V5.4A1.9 1.9 0 0 0 12.6 3.5H6.4a1.9 1.9 0 0 0-1.9 1.9v13.2a1.9 1.9 0 0 0 1.9 1.9h6.2a1.9 1.9 0 0 0 1.9-1.9v-2.1" />
      <path d="M9.8 12h10.3M16.6 8.5L20.1 12l-3.5 3.5" />
    </Icon>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 3.5L10.8 13.2M20.5 3.5l-6.2 17-3.5-7.3-7.3-3.5 17-6.2z" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8l4 4" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 9.5a2 2 0 0 1 2-2h6.1a2 2 0 0 1 2 2v6.1a2 2 0 0 1-2 2h-6.1a2 2 0 0 1-2-2V9.5z" />
      <path d="M15.5 7.5v-.9a2 2 0 0 0-2-2H7.4a2 2 0 0 0-2 2v6.1a2 2 0 0 0 2 2h.9" />
    </Icon>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.2v15.6M7 19.8h10M5 7.5l7-2 7 2" />
      <path d="M5 7.5L2.4 14h5.2L5 7.5zM19 7.5L16.4 14h5.2L19 7.5z" />
    </Icon>
  );
}
