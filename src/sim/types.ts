// Core domain types for the race simulation engine.
// This module has zero React/UI dependencies so it can be tested and reused in isolation.

export type TireCompound = "soft" | "medium" | "hard" | "intermediate" | "wet";

export type DrivingMode = "push" | "balanced" | "conserve";

/** dry = normal grip; damp = light rain/drying track, suits intermediates; wet = heavy rain, suits full wets. */
export type WeatherCondition = "dry" | "damp" | "wet";

export interface DriverStats {
  /** Raw one-lap pace, 0-100. Higher is faster. */
  pace: number;
  /** How gently the driver treats tires, 0-100. Higher = slower degradation. */
  tireManagement: number;
  /** How consistent lap times are, 0-100. Higher = less random variance. */
  consistency: number;
  /** Willingness to push/attack, 0-100. Higher = more pace but more tire wear and risk. */
  aggression: number;
}

export interface Driver {
  id: string;
  name: string;
  teamId: string;
  stats: DriverStats;
  /** Editable flavor fields — only populated for the player's driver today. */
  age?: number;
  nationality?: string;
  number?: number;
}

export interface Team {
  id: string;
  name: string;
  /** Car performance, 0-100. Adds to driver pace to form total car+driver pace. */
  carPerformance: number;
}

export interface TrackCorner {
  /** Rough difficulty of overtaking at this part of the lap, 0-1. Used in later phases. */
  overtakingDifficulty: number;
}

export interface Track {
  id: string;
  name: string;
  /** Length of a single lap in km. */
  lapLengthKm: number;
  totalLaps: number;
  /** Time lost (seconds) traveling through the pit lane at the speed limit vs staying on track. */
  pitLaneLossSeconds: number;
  /** Baseline lap time (seconds) for a "perfect" 100-pace car/driver on fresh mediums, no fuel effect. */
  baseLapTimeSeconds: number;
  /** How hard this track is on tires overall, 0-1. Scales degradation. */
  tireWearFactor: number;
  /** How much overall difficulty overtaking is at this track, 0-1. Used in later phases. */
  overtakingDifficulty: number;
}

export interface TireCompoundDef {
  compound: TireCompound;
  /** Lap time delta (seconds) vs the track baseline when fresh (negative = faster). */
  paceDeltaSeconds: number;
  /** Degradation per lap (seconds lost per lap) at baseline wear rate, before track/driver factors. */
  degradationPerLap: number;
  /** Degradation grows the older the tire gets; this is the quadratic term coefficient. */
  degradationGrowth: number;
}

export interface PitStopPlan {
  /** Lap number on which to pit (1-indexed; pit happens at the end of this lap). */
  lap: number;
  compound: TireCompound;
}

export type DamageSeverity = "minor" | "major" | "mechanical";

/** vsc = Virtual Safety Car (flat delta, field holds position); sc = full Safety Car
 *  (field physically bunches up behind it, much cheaper pit stops). */
export type CautionType = "vsc" | "sc";

export interface CautionPeriod {
  type: CautionType;
  /** Total laps this caution period lasts, fixed the lap it's triggered. */
  durationLaps: number;
  /** Laps left. Counts down starting the lap *after* it's triggered — the lap an incident
   *  happens still plays out at racing speed up to that point. */
  lapsRemaining: number;
}

export interface CarState {
  driver: Driver;
  team: Team;
  /** Total accumulated race time in seconds, including pit stop losses. */
  totalTimeSeconds: number;
  currentCompound: TireCompound;
  /** Laps completed on the current set of tires. */
  tireAge: number;
  lapsCompleted: number;
  drivingMode: DrivingMode;
  /** Remaining planned pit stops, in lap order. Consumed as the race progresses. */
  pitPlan: PitStopPlan[];
  pitStopsMade: number;
  isPlayer: boolean;
  /** true once the car has completed totalLaps. */
  finished: boolean;
  /** Lap time history, index 0 = lap 1. */
  lapTimes: number[];
  /** Seconds added to every lap from unrepaired damage (0 = none). Cleared by any pit stop. */
  damagePenaltySeconds: number;
  /** Extra pit time (seconds), on top of the normal stop, needed to fix current damage. Undefined when there's no active damage. */
  pendingRepairSeconds?: number;
  /** Human-readable label for the active damage (e.g. "Suspension damage"). Undefined when there's no active damage. */
  damageLabel?: string;
  damageSeverity?: DamageSeverity;
  /** Flavor sentence describing the active damage and its effect — for the alert popup. Undefined when there's no active damage. */
  damageDescription?: string;
  /** true once the car has retired (mechanical/damage failure) — distinct from `finished`, which is also
   *  set true on a retirement so the race loop stops simulating this car either way. */
  retired?: boolean;
  /** Human-readable reason for retirement (e.g. "Engine failure"). Undefined unless `retired`. */
  retiredReason?: string;
  /** Cumulative time penalties (seconds) applied this race, added directly into totalTimeSeconds — tracked
   *  separately too so the final results screen can show it as its own column. */
  penaltySeconds: number;
}

export interface LapEvent {
  type: "pit-stop" | "overtake" | "damage" | "weather" | "penalty" | "retirement" | "caution";
  lap: number;
  /** Empty for race-wide events (weather, caution) that aren't tied to one car. */
  driverId: string;
  message: string;
}

export interface RaceState {
  track: Track;
  cars: CarState[];
  currentLap: number;
  finished: boolean;
  events: LapEvent[];
  weather: WeatherCondition;
  /** Active Safety Car / VSC period, or null when racing is green. */
  caution: CautionPeriod | null;
}
