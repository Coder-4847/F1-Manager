// Core domain types for the race simulation engine.
// This module has zero React/UI dependencies so it can be tested and reused in isolation.

export type TireCompound = "soft" | "medium" | "hard";

export type DrivingMode = "push" | "balanced" | "conserve";

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
}

export interface LapEvent {
  type: "pit-stop" | "overtake";
  lap: number;
  driverId: string;
  message: string;
}

export interface RaceState {
  track: Track;
  cars: CarState[];
  currentLap: number;
  finished: boolean;
  events: LapEvent[];
}
