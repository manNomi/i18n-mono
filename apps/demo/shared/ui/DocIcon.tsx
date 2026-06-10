type DocIconType =
  | "bolt"
  | "check"
  | "download"
  | "file"
  | "search"
  | "sync"
  | "table"
  | "upload"
  | "warning";

type DocIconProps = {
  className?: string;
  size?: number;
  type?: DocIconType;
};

const paths: Record<DocIconType, string> = {
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  check: "m5 12 4 4L19 6",
  download: "M12 3v12m0 0 5-5m-5 5-5-5M5 21h14",
  file: "M6 3h8l4 4v14H6V3Zm8 0v5h5",
  search: "m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
  sync: "M4 12a8 8 0 0 1 13.7-5.7M20 12A8 8 0 0 1 6.3 17.7M17 3v4h-4M7 21v-4h4",
  table: "M4 5h16v14H4V5Zm0 5h16M9 5v14M15 5v14",
  upload: "M12 21V9m0 0-5 5m5-5 5 5M5 3h14",
  warning: "M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01",
};

export function DocIcon({
  className = "",
  size = 18,
  type = "check",
}: DocIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d={paths[type]} />
    </svg>
  );
}
