import type { CarState, DamageSeverity, WeatherCondition } from "./types";
import { weatherRiskMultiplier } from "./weather";

export interface DamageEvent {
  severity: DamageSeverity;
  label: string;
  /** Flavor sentence explaining what happened and what it costs — shown in the alert popup. */
  description: string;
  /** Seconds added to every subsequent lap until repaired. */
  lapTimePenaltySeconds: number;
  /** Extra pit time (seconds), on top of the normal stop, to fix it. */
  repairPitLossSeconds: number;
}

interface DamageOption {
  label: string;
  description: string;
}

const MINOR_OPTIONS: DamageOption[] = [
  { label: "Front wing knock", description: "A knock on the front wing has chipped away some front-end grip." },
  { label: "Bodywork scrape", description: "A scrape along the bodywork is creating a little extra drag." },
  { label: "Floor damage", description: "A clipped floor edge is bleeding away underfloor downforce." },
];

const MAJOR_OPTIONS: DamageOption[] = [
  {
    label: "Broken front wing endplate",
    description: "A broken endplate has badly upset the front wing's airflow.",
  },
  {
    label: "Suspension damage",
    description: "Damaged suspension geometry is costing grip through every corner.",
  },
  { label: "Diffuser damage", description: "A damaged diffuser is bleeding rear downforce on every lap." },
];

const MECHANICAL_OPTIONS: DamageOption[] = [
  { label: "Gearbox issue", description: "A gearbox issue is causing rough, hesitant shifts out of every corner." },
  { label: "Hydraulic leak", description: "A hydraulic leak is slowly robbing the car of its systems." },
  {
    label: "Engine warning light",
    description: "An engine warning light means the power unit is running in a protective, detuned mode.",
  },
];

/** Base per-lap chance of picking up new damage — deliberately low, this should feel like an occasional event, not a constant threat. */
const DAMAGE_CHANCE_PER_LAP = 0.009;
/** Cumulative severity thresholds once a damage roll succeeds: below MINOR -> minor, below MAJOR -> major, above -> mechanical (rarer still). */
const MINOR_THRESHOLD = 0.7;
const MAJOR_THRESHOLD = 0.95;

const SEVERITY_RANK: Record<DamageSeverity, number> = { minor: 1, major: 2, mechanical: 3 };

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Rolls whether a car picks up new damage this lap. More aggressive drivers push
 * the car harder, so aggression scales the odds up a bit (0.7x-1.3x of base); running
 * the wrong tire for current conditions (or just being in the wet at all) scales the
 * odds up further still. Independent per car per lap — most laps for most cars,
 * nothing happens.
 */
export function rollForDamage(
  car: CarState,
  weather: WeatherCondition,
  random: () => number = Math.random
): DamageEvent | null {
  const aggressionFactor = 0.7 + (car.driver.stats.aggression / 100) * 0.6;
  const riskFactor = weatherRiskMultiplier(car.currentCompound, weather);
  if (random() >= DAMAGE_CHANCE_PER_LAP * aggressionFactor * riskFactor) return null;

  const severityRoll = random();
  if (severityRoll < MINOR_THRESHOLD) {
    const option = pick(MINOR_OPTIONS, random);
    return {
      severity: "minor",
      ...option,
      lapTimePenaltySeconds: 0.3 + random() * 0.5,
      repairPitLossSeconds: 1 + random() * 1.5,
    };
  }
  if (severityRoll < MAJOR_THRESHOLD) {
    const option = pick(MAJOR_OPTIONS, random);
    return {
      severity: "major",
      ...option,
      lapTimePenaltySeconds: 1 + random() * 1.2,
      repairPitLossSeconds: 3 + random() * 2,
    };
  }
  const option = pick(MECHANICAL_OPTIONS, random);
  return {
    severity: "mechanical",
    ...option,
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
    car.damageDescription = event.description;
  }
}

/** Clears a car's active damage — called when a pit stop repairs it. */
export function clearDamage(car: CarState): void {
  car.damagePenaltySeconds = 0;
  car.pendingRepairSeconds = undefined;
  car.damageLabel = undefined;
  car.damageSeverity = undefined;
  car.damageDescription = undefined;
}
