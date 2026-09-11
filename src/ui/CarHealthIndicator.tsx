import type { DamageSeverity } from "../sim/types";

// Green -> orange -> red, matching how the user described wanting it: healthy, damaged,
// severely damaged. Minor and major share the same "damaged" orange deliberately — the
// point is a quick visual read, not a fine-grained severity gauge (the text elsewhere
// already spells out exactly what's wrong).
const SEVERITY_COLOR: Record<"none" | DamageSeverity, string> = {
  none: "var(--wear-low)",
  minor: "#ff8a00",
  major: "#ff8a00",
  mechanical: "var(--wear-high)",
};

export interface CarHealthIndicatorProps {
  severity?: DamageSeverity;
  className?: string;
}

/** A small schematic top-down car silhouette that changes color with damage severity. */
export function CarHealthIndicator({ severity, className }: CarHealthIndicatorProps) {
  const color = SEVERITY_COLOR[severity ?? "none"];
  return (
    <svg
      viewBox="0 0 120 50"
      className={"car-health" + (className ? ` ${className}` : "")}
      role="img"
      aria-label={`Car condition: ${severity ?? "good"}`}
    >
      <g fill={color} className="car-health__body">
        <rect x="8" y="12" width="12" height="26" rx="3" />
        <rect x="100" y="8" width="12" height="34" rx="3" />
        <rect x="18" y="17" width="84" height="16" rx="7" />
        <path d="M48 17 L72 17 L67 7 L53 7 Z" />
        <circle cx="28" cy="9" r="6" />
        <circle cx="28" cy="41" r="6" />
        <circle cx="92" cy="9" r="6" />
        <circle cx="92" cy="41" r="6" />
      </g>
    </svg>
  );
}
