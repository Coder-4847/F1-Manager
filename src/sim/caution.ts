import type { CautionPeriod, CautionType, DamageSeverity } from "./types";

/** Chance a retirement escalates to a full Safety Car rather than just a Virtual Safety Car. */
const RETIREMENT_SC_CHANCE = 0.4;
/** Independent chance that major/mechanical damage (with no retirement) is on its own enough
 *  to bring out a VSC while the stricken car limps back — this never escalates to a full SC. */
const DAMAGE_VSC_CHANCE = 0.12;

const VSC_MIN_LAPS = 3;
const VSC_MAX_LAPS = 5;
const SC_MIN_LAPS = 4;
const SC_MAX_LAPS = 7;

/** Portion of the gap to the car ahead that closes up each lap while a full Safety Car bunches the field. */
export const SC_GAP_CLOSURE_RATE = 0.45;
/** Floor so bunched cars never mathematically tie or "overtake" for free while closing up. */
export const SC_MIN_GAP_SECONDS = 0.05;

function randomLapCount(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function buildPeriod(type: CautionType, random: () => number): CautionPeriod {
  const durationLaps =
    type === "sc" ? randomLapCount(SC_MIN_LAPS, SC_MAX_LAPS, random) : randomLapCount(VSC_MIN_LAPS, VSC_MAX_LAPS, random);
  return { type, durationLaps, lapsRemaining: durationLaps };
}

/** Every car runs this much slower per lap under the given caution type — a multiplier on
 *  the normal lap time so it scales naturally with each track's own pace rather than a flat
 *  seconds figure that would be wildly wrong between, say, Monaco and Spa. */
export function cautionLapTimeMultiplier(type: CautionType): number {
  return type === "sc" ? 1.6 : 1.35;
}

/** Pit stops cost much less real time relative to the (slowed) field under caution — the
 *  strategic "cheap window" this whole feature exists to create. */
export function cautionPitLossMultiplier(type: CautionType): number {
  return type === "sc" ? 0.35 : 0.65;
}

/** Rolls what kind of caution (and how long) a retirement brings out — always at least a VSC. */
export function rollCautionForRetirement(random: () => number = Math.random): CautionPeriod {
  return buildPeriod(random() < RETIREMENT_SC_CHANCE ? "sc" : "vsc", random);
}

/** Small independent chance that major/mechanical damage alone (no retirement) is serious
 *  enough to bring out a VSC. Returns null far more often than not. */
export function rollCautionForDamage(severity: DamageSeverity, random: () => number = Math.random): CautionPeriod | null {
  if (severity !== "major" && severity !== "mechanical") return null;
  if (random() >= DAMAGE_VSC_CHANCE) return null;
  return buildPeriod("vsc", random);
}
