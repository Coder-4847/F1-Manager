import type { CarState, DrivingMode, Track, WeatherCondition } from "./types";
import { tireCompounds, tireWearPenalty } from "./tires";
import { tireWeatherPenaltySeconds, weatherBaseLapPenaltySeconds, weatherLevel } from "./weather";
import { FUEL_LOAD_PACE_DELTA, FUEL_SAVING_PENALTY_SECONDS } from "./fuel";
import { downforcePaceDeltaSeconds, downforceTireWearMultiplier } from "./downforce";

const REFERENCE_PACE = 85;
const PACE_SCALE_SECONDS_PER_POINT = 0.08;
const MAX_FUEL_PENALTY_SECONDS = 1.5;
const MAX_RANDOM_NOISE_SECONDS = 0.4;

const DRIVING_MODE_PACE_DELTA: Record<DrivingMode, number> = {
  push: -0.3,
  balanced: 0,
  conserve: 0.3,
};

/** Multiplier applied to tire wear based on driving mode. */
const DRIVING_MODE_WEAR_MULTIPLIER: Record<DrivingMode, number> = {
  push: 1.35,
  balanced: 1.0,
  conserve: 0.7,
};

/**
 * Simulates one lap for a car and returns the lap time in seconds.
 * Pure function of current state + a random source, so it's easy to test.
 */
export function calculateLapTime(
  car: CarState,
  track: Track,
  weather: WeatherCondition,
  random: () => number = Math.random
): number {
  const combinedPace = 0.5 * car.team.carPerformance + 0.5 * car.driver.stats.pace;
  const pacePenalty = (REFERENCE_PACE - combinedPace) * PACE_SCALE_SECONDS_PER_POINT;

  const compoundDelta =
    tireCompounds[car.currentCompound].paceDeltaSeconds + tireWeatherPenaltySeconds(car.currentCompound, weather);

  // Higher tireManagement stat -> lower wear multiplier (0.6-1.0 range).
  const managementFactor = 1 - (car.driver.stats.tireManagement / 100) * 0.4;
  const wearPenalty =
    tireWearPenalty(
      car.currentCompound,
      car.tireAge,
      track.tireWearFactor,
      managementFactor * DRIVING_MODE_WEAR_MULTIPLIER[car.drivingMode]
    ) *
    car.tireWearMultiplier *
    downforceTireWearMultiplier(car.downforce);

  const lapsRemainingFraction = Math.max(0, track.totalLaps - car.lapsCompleted) / track.totalLaps;
  const fuelPenalty = MAX_FUEL_PENALTY_SECONDS * lapsRemainingFraction;

  const modeDelta = DRIVING_MODE_PACE_DELTA[car.drivingMode];
  const weatherPenalty = weatherBaseLapPenaltySeconds(weather);
  const fuelLoadDelta = FUEL_LOAD_PACE_DELTA[car.fuelLoad];
  const fuelSavingPenalty = car.fuelSaving ? FUEL_SAVING_PENALTY_SECONDS : 0;
  const downforceDelta = downforcePaceDeltaSeconds(car.downforce, track);

  // Consistency reduces random noise: 100 consistency -> ~0 noise, 0 -> full noise.
  // Wetter conditions amplify that noise further — everyone's a bit scrappier in the rain.
  const noiseAmplitude =
    ((100 - car.driver.stats.consistency) / 100) * MAX_RANDOM_NOISE_SECONDS * (1 + weatherLevel(weather) * 0.25);
  const noise = (random() - 0.5) * 2 * noiseAmplitude;

  const lapTime =
    track.baseLapTimeSeconds +
    pacePenalty +
    compoundDelta +
    wearPenalty +
    fuelPenalty +
    modeDelta +
    weatherPenalty +
    fuelLoadDelta +
    fuelSavingPenalty +
    downforceDelta +
    noise +
    car.damagePenaltySeconds;

  return Math.max(lapTime, track.baseLapTimeSeconds * 0.5);
}
