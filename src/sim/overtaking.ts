import type { CarState, Track } from "./types";
import { tireWearPercent } from "./tires";

const BASE_PASS_CHANCE = 0.5;

/**
 * Resolves a single overtaking attempt for one lap: `attacker` was behind
 * `defender` entering the lap and has closed to within fighting range.
 * Returns true if the pass succeeds. Deliberately simple — a handful of
 * weighted factors plus noise, not a physics model — but it rewards a real
 * pace/tire advantage rather than swinging on pure chance.
 */
export function resolveOvertakeAttempt(
  attacker: CarState,
  attackerLapTime: number,
  defender: CarState,
  defenderLapTime: number,
  track: Track,
  random: () => number = Math.random
): boolean {
  // Positive = attacker was genuinely quicker this lap.
  const paceDelta = defenderLapTime - attackerLapTime;
  const paceFactor = paceDelta * 0.6;

  const attackerWear = tireWearPercent(attacker.currentCompound, attacker.tireAge);
  const defenderWear = tireWearPercent(defender.currentCompound, defender.tireAge);
  const tireFactor = ((defenderWear - attackerWear) / 100) * 0.3;

  const aggressionFactor = ((attacker.driver.stats.aggression - defender.driver.stats.consistency) / 100) * 0.15;

  // Lower overtakingDifficulty (e.g. a power track like Monza) makes passes easier.
  const trackFactor = (0.5 - track.overtakingDifficulty) * 0.4;

  const noise = (random() - 0.5) * 0.2;

  const passProbability = BASE_PASS_CHANCE + paceFactor + tireFactor + aggressionFactor + trackFactor + noise;

  return random() < Math.max(0.05, Math.min(0.95, passProbability));
}
