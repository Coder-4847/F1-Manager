import type { DrivingMode, FuelLoad } from "./types";

// A whole-race resource, not per-stint — there's no refueling at pit stops (matching modern
// F1), so the pre-race load choice and driving-mode discipline across the *entire* race are
// what determine whether the margin lasts. Deliberately a single flat budget + burn-rate
// model rather than a real thermodynamic fuel simulation — tactical, not a hardcore sim.

export const FUEL_LOADS: FuelLoad[] = ["light", "standard", "heavy"];

export const FUEL_LOAD_LABEL: Record<FuelLoad, string> = {
  light: "Light",
  standard: "Standard",
  heavy: "Heavy",
};

/** Flat per-lap pace delta (seconds) from carrying more or less fuel than a normal load —
 *  a lighter car is quicker everywhere, a heavier one pays a fixed cost the whole race. */
export const FUEL_LOAD_PACE_DELTA: Record<FuelLoad, number> = {
  light: -0.25,
  standard: 0,
  heavy: 0.25,
};

/** Starting fuel budget as a multiple of race distance — Light is deliberately short of
 *  what a full-balanced-mode race burns, so pushing hard for too long risks running the
 *  margin out; Heavy is generous enough to never realistically run dry. */
const FUEL_BUDGET_LAP_MULTIPLIER: Record<FuelLoad, number> = {
  light: 0.85,
  standard: 1.15,
  heavy: 1.5,
};

/** Per-lap fuel burn multiplier by driving mode — mirrors the existing tire-wear driving-mode
 *  multipliers in lapTime.ts, so the same strategic lever (push/balanced/conserve) now also
 *  trades fuel margin, not just tire life. */
const FUEL_BURN_MODE_MULTIPLIER: Record<DrivingMode, number> = {
  push: 1.35,
  balanced: 1.0,
  conserve: 0.7,
};

/** Extra lap time (seconds) once a car has run its fuel margin dry — a forced lift-and-coast
 *  for the rest of the race. Worse than Light's own pace bonus, so running dry is a genuine
 *  tactical mistake to manage around (via driving mode), not just a minor inconvenience. */
export const FUEL_SAVING_PENALTY_SECONDS = 0.6;

export function initialFuelRemaining(load: FuelLoad, totalLaps: number): number {
  return totalLaps * FUEL_BUDGET_LAP_MULTIPLIER[load];
}

export function fuelBurnForLap(mode: DrivingMode): number {
  return FUEL_BURN_MODE_MULTIPLIER[mode];
}
