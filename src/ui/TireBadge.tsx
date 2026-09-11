import type { TireCompound } from "../sim/types";
import { tireWearPercent } from "../sim/tires";

const COMPOUND_LABEL: Record<TireCompound, string> = {
  soft: "S",
  medium: "M",
  hard: "H",
  intermediate: "I",
  wet: "W",
};

function wearColor(pct: number): string {
  if (pct >= 80) return "var(--wear-high)";
  if (pct >= 50) return "var(--wear-mid)";
  return "var(--wear-low)";
}

export function TireBadge({ compound, tireAge }: { compound: TireCompound; tireAge: number }) {
  const pct = tireWearPercent(compound, tireAge);
  return (
    <div className="tire-badge" title={`${compound} · ${tireAge} laps · ${pct}% worn`}>
      <span className={`tire-chip tire-chip--${compound}`}>{COMPOUND_LABEL[compound]}</span>
      <span className="tire-wear-bar">
        <span
          className="tire-wear-fill"
          style={{ width: `${pct}%`, background: wearColor(pct) }}
        />
      </span>
    </div>
  );
}
