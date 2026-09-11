import type { CarState, DamageSeverity } from "./types";

export interface DamageEvent {
  severity: DamageSeverity;
  label: string;
  /** Seconds added to every subsequent lap until repaired. */
  lapTimePenaltySeconds: number;
  /** Extra pit time (seconds), on top of the normal stop, to fix it. */
  repairPitLossSeconds: number;
}

const MINOR_LABELS = ["Front wing knock", "Bodywork scrape", "Floor damage"];
const MAJOR_LABELS = ["Broken front wing endplate", "Suspension damage", "Diffuser damage"];
const MECHANICAL_LABELS = ["Gearbox issue", "Hydraulic leak", "Engine warning light"];

/** Base per-lap chance of picking up new damage — deliberately low, this should feel like an occasional event, not a constant threat. */
const DAMAGE_CHANCE_PER_LAP = 0.012;
/** Cumulative severity thresholds once a damage roll succeeds: below MINOR -> minor, below MAJOR -> major, above -> mechanical (rarer still). */
const MINOR_THRESHOLD = 0.7;
const MAJOR_THRESHOLD = 0.95;

const SEVERITY_RANK: Record<DamageSeverity, number> = { minor: 1, major: 2, mechanical: 3 };

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Rolls whether a car picks up new damage this lap. More aggressive drivers push
 * the car harder, so aggression scales the odds up a bit (0.7x-1.3x of base).
 * Independent per car per lap — most laps for most cars, nothing happens.
 */
export function rollForDamage(car: CarState, random: () => number = Math.random): DamageEvent | null {
  const aggressionFactor = 0.7 + (car.driver.stats.aggression / 100) * 0.6;
  if (random() >= DAMAGE_CHANCE_PER_LAP * aggressionFactor) return null;

  const severityRoll = random();
  if (severityRoll < MINOR_THRESHOLD) {
    return {
      severity: "minor",
      label: pick(MINOR_LABELS, random),
      lapTimePenaltySeconds: 0.3 + random() * 0.5,
      repairPitLossSeconds: 1 + random() * 1.5,
    };
  }
  if (severityRoll < MAJOR_THRESHOLD) {
    return {
      severity: "major",
      label: pick(MAJOR_LABELS, random),
      lapTimePenaltySeconds: 1 + random() * 1.2,
      repairPitLossSeconds: 3 + random() * 2,
    };
  }
  return {
    severity: "mechanical",
    label: pick(MECHANICAL_LABELS, random),
    lapTimePenaltySeconds: 2.5 + random() * 2,
    repairPitLossSeconds: 6 + random() * 4,
  };
}

/**
 * Applies a damage event to a car in place. Stacks with any existing unrepaired
 * damage (penalties/repair time add up) rather than overwriting it — rare, since
 * a second hit before pitting is unlikely, but it can happen.
 */
export function applyDamage(car: CarState, event: DamageEvent): void {
  car.damagePenaltySeconds += event.lapTimePenaltySeconds;
  car.pendingRepairSeconds = (car.pendingRepairSeconds ?? 0) + event.repairPitLossSeconds;
  if (!car.damageSeverity || SEVERITY_RANK[event.severity] > SEVERITY_RANK[car.damageSeverity]) {
    car.damageSeverity = event.severity;
    car.damageLabel = event.label;
  }
}

/** Clears a car's active damage — called when a pit stop repairs it. */
export function clearDamage(car: CarState): void {
  car.damagePenaltySeconds = 0;
  car.pendingRepairSeconds = undefined;
  car.damageLabel = undefined;
  car.damageSeverity = undefined;
}
