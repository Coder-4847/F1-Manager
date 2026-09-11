import type { CarState, DrivingMode } from "./types";

export interface PenaltyEvent {
  seconds: number;
  reason: string;
}

const REASONS = [
  "track limits violation",
  "unsafe release from the pits",
  "speeding in the pit lane",
  "causing a collision",
  "ignoring blue flags",
];

const BASE_PENALTY_CHANCE_PER_LAP = 0.004;

/** Driving mode is the dominant risk factor — pushing hard risks track limits, contact,
 *  and pit-lane infringements far more than conserving does. */
const MODE_RISK_MULTIPLIER: Record<DrivingMode, number> = {
  conserve: 0.35,
  balanced: 1,
  push: 2.4,
};

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/** Rolls whether a car picks up a time penalty this lap. */
export function rollForPenalty(car: CarState, random: () => number = Math.random): PenaltyEvent | null {
  const modeRisk = MODE_RISK_MULTIPLIER[car.drivingMode];
  // A more aggressive personality compounds the risk a bit further, independent of mode.
  const aggressionFactor = 0.8 + (car.driver.stats.aggression / 100) * 0.4;
  const chance = BASE_PENALTY_CHANCE_PER_LAP * modeRisk * aggressionFactor;
  if (random() >= chance) return null;

  return {
    seconds: 5 + Math.floor(random() * 6), // 5-10s, a standard F1-ish penalty range
    reason: pick(REASONS, random),
  };
}
