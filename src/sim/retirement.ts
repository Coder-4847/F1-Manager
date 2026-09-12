import type { CarState, WeatherCondition } from "./types";
import { weatherMismatch } from "./weather";

export interface RetirementEvent {
  reason: string;
}

// Deliberately tiny numbers — see the reasoning below. Tuned so that across a full
// ~55-lap race: all three risk factors together lands around ~3% (rare, but it can
// happen); any single factor alone lands under ~1.5% (should barely ever show up);
// and the baseline with none of them is well under 0.2% (essentially flavor-only).
const BASE_CHANCE_PER_LAP = 0.00003;
const DAMAGE_CONTRIBUTION = 0.00015;
const WEATHER_MISMATCH_CONTRIBUTION_PER_LEVEL = 0.00012;
const PUSH_MODE_BASE_CONTRIBUTION = 0.0001;
const PUSH_MODE_AGGRESSION_CONTRIBUTION = 0.0001;

const GENERIC_REASONS = ["Engine failure", "Power unit issue", "Mechanical failure"];
const WEATHER_REASONS = ["Aquaplanes off track", "Loses control in the conditions", "Spins off in treacherous conditions"];
const PUSH_REASONS = ["Pushes too hard and crashes out", "Loses the car at speed", "Engine gives up under the strain"];

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function pickReason(
  car: CarState,
  hasDamage: boolean,
  mismatch: number,
  pushing: boolean,
  random: () => number
): string {
  // Prefer the most narratively concrete explanation available, in order of how
  // directly it's tied to a cause the player can see and react to.
  if (hasDamage && car.damageLabel) return `${car.damageLabel} finally gives out`;
  if (mismatch >= 2) return pick(WEATHER_REASONS, random);
  if (pushing) return pick(PUSH_REASONS, random);
  return pick(GENERIC_REASONS, random);
}

/**
 * Extremely rare per-lap roll for a car retiring outright (DNF) — the race-ending
 * version of damage. Three risk factors stack additively: active unrepaired damage,
 * running the wrong tire for current conditions, and driving in push mode. Any one of
 * them alone barely moves the needle; having all three at once is when it becomes
 * something that can plausibly happen, without ever being common.
 */
export function rollForRetirement(
  car: CarState,
  weather: WeatherCondition,
  random: () => number = Math.random
): RetirementEvent | null {
  let chance = BASE_CHANCE_PER_LAP;

  const hasDamage = car.damageSeverity !== undefined;
  if (hasDamage) chance += DAMAGE_CONTRIBUTION;

  const mismatch = weatherMismatch(car.currentCompound, weather);
  if (mismatch > 0) chance += WEATHER_MISMATCH_CONTRIBUTION_PER_LEVEL * mismatch;

  const pushing = car.drivingMode === "push";
  if (pushing) {
    chance += PUSH_MODE_BASE_CONTRIBUTION + (car.driver.stats.aggression / 100) * PUSH_MODE_AGGRESSION_CONTRIBUTION;
  }

  chance *= car.reliabilityMultiplier;

  if (random() >= chance) return null;

  return { reason: pickReason(car, hasDamage, mismatch, pushing, random) };
}
