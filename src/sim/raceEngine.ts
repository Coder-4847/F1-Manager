import type { CarState, Driver, DrivingMode, LapEvent, PitStopPlan, RaceState, TireCompound, Track } from "./types";
import type { AIDecisionContext, InitialStrategy } from "./strategy";
import { calculateLapTime } from "./lapTime";
import { pitStopTimeLoss } from "./pitStop";
import { decideAIAction, generateAIStrategy } from "./strategy";
import { drivers, getTeam } from "./roster";

export interface RaceSetup {
  track: Track;
  /** driverId of the car the player controls. */
  playerDriverId: string;
  playerStrategy: InitialStrategy;
  random?: () => number;
}

function createCarState(driver: Driver, isPlayer: boolean, strategy: InitialStrategy): CarState {
  const team = getTeam(driver.teamId);
  return {
    driver,
    team,
    totalTimeSeconds: 0,
    currentCompound: strategy.startingCompound,
    tireAge: 0,
    lapsCompleted: 0,
    drivingMode: strategy.drivingMode,
    pitPlan: [...strategy.pitPlan].sort((a, b) => a.lap - b.lap),
    pitStopsMade: 0,
    isPlayer,
    finished: false,
    lapTimes: [],
  };
}

export function setupRace(setup: RaceSetup): RaceState {
  const random = setup.random ?? Math.random;
  const cars: CarState[] = drivers.map((driver) => {
    const isPlayer = driver.id === setup.playerDriverId;
    const strategy = isPlayer ? setup.playerStrategy : generateAIStrategy(driver, setup.track, random);
    return createCarState(driver, isPlayer, strategy);
  });

  return {
    track: setup.track,
    cars,
    currentLap: 0,
    finished: false,
    events: [],
  };
}

function orderByTime(state: RaceState): string[] {
  return [...state.cars]
    .sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds)
    .map((c) => c.driver.id);
}

/** Advances every car by exactly one lap, mutating and returning the same RaceState. */
export function simulateLap(state: RaceState, random: () => number = Math.random): RaceState {
  if (state.finished) return state;

  const orderBefore = orderByTime(state);

  // Snapshot pre-lap totals/tire ages so AI decisions this lap all see the same
  // "entering this lap" picture, regardless of the order cars are processed in.
  const preLap = new Map(state.cars.map((c) => [c.driver.id, { totalTime: c.totalTimeSeconds, tireAge: c.tireAge }]));

  state.currentLap += 1;
  const lapEvents: LapEvent[] = [];
  let fastestLap = { driverId: "", time: Infinity };

  for (const car of state.cars) {
    if (car.finished) continue;

    if (!car.isPlayer) {
      const idx = orderBefore.indexOf(car.driver.id);
      const aheadId = idx > 0 ? orderBefore[idx - 1] : null;
      const behindId = idx < orderBefore.length - 1 ? orderBefore[idx + 1] : null;
      const ahead = aheadId ? preLap.get(aheadId) : undefined;
      const behind = behindId ? preLap.get(behindId) : undefined;
      const self = preLap.get(car.driver.id)!;

      const ctx: AIDecisionContext = {
        track: state.track,
        gapAheadSeconds: ahead ? self.totalTime - ahead.totalTime : null,
        gapBehindSeconds: behind ? behind.totalTime - self.totalTime : null,
        aheadTireAge: ahead ? ahead.tireAge : null,
        behindTireAge: behind ? behind.tireAge : null,
      };

      const decision = decideAIAction(car, ctx, random);
      car.drivingMode = decision.drivingMode;
      if (decision.pitCompound) {
        car.pitPlan = [{ lap: state.currentLap, compound: decision.pitCompound }];
      }
    }

    const duePitStop: PitStopPlan | undefined =
      car.pitPlan[0]?.lap === state.currentLap ? car.pitPlan.shift() : undefined;

    const lapTime = calculateLapTime(car, state.track, random);
    car.totalTimeSeconds += lapTime;
    car.lapTimes.push(lapTime);
    car.tireAge += 1;
    car.lapsCompleted += 1;

    if (duePitStop) {
      const loss = pitStopTimeLoss(state.track, random);
      car.totalTimeSeconds += loss;
      car.currentCompound = duePitStop.compound;
      car.tireAge = 0;
      car.pitStopsMade += 1;
      lapEvents.push({
        type: "pit-stop",
        lap: state.currentLap,
        driverId: car.driver.id,
        message: `${car.driver.name} pits for ${duePitStop.compound} tires (+${loss.toFixed(1)}s)`,
      });
    }

    if (lapTime < fastestLap.time) {
      fastestLap = { driverId: car.driver.id, time: lapTime };
    }

    if (car.lapsCompleted >= state.track.totalLaps) {
      car.finished = true;
    }
  }

  const orderAfter = orderByTime(state);
  const driverById = new Map(state.cars.map((c) => [c.driver.id, c]));
  orderAfter.forEach((driverId, afterIndex) => {
    const beforeIndex = orderBefore.indexOf(driverId);
    if (beforeIndex !== -1 && afterIndex < beforeIndex) {
      const car = driverById.get(driverId)!;
      lapEvents.push({
        type: "position-change",
        lap: state.currentLap,
        driverId,
        message: `${car.driver.name} moves up to P${afterIndex + 1}`,
      });
    }
  });

  state.events.push(...lapEvents);

  if (state.cars.every((c) => c.finished)) {
    state.finished = true;
  }

  return state;
}

function getPlayerCar(state: RaceState): CarState | undefined {
  return state.cars.find((c) => c.isPlayer);
}

/** Changes the player car's driving mode with immediate effect from the next simulated lap. */
export function setPlayerDrivingMode(state: RaceState, mode: DrivingMode): void {
  const car = getPlayerCar(state);
  if (car) car.drivingMode = mode;
}

/**
 * Replaces the player car's pending pit stop queue with a single stop on the given lap.
 * Only one pending stop is tracked at a time in Phase 2 — calling this again before the
 * scheduled lap overrides it (e.g. changing your mind about the compound).
 */
export function queuePlayerPitStop(state: RaceState, lap: number, compound: TireCompound): void {
  const car = getPlayerCar(state);
  if (car) car.pitPlan = [{ lap, compound }];
}

/** Clears any pending (not-yet-executed) pit stop for the player car. */
export function cancelPlayerPitStop(state: RaceState): void {
  const car = getPlayerCar(state);
  if (car) car.pitPlan = [];
}

export function runFullRace(state: RaceState, random: () => number = Math.random): RaceState {
  while (!state.finished) {
    simulateLap(state, random);
  }
  return state;
}

export interface StandingsRow {
  position: number;
  car: CarState;
  gapToLeaderSeconds: number;
}

/** Standings ordered by total race time (ascending). Valid mid-race and post-race for Phase 1's no-lapped-traffic model. */
export function getStandings(state: RaceState): StandingsRow[] {
  const sorted = [...state.cars].sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds);
  const leaderTime = sorted[0]?.totalTimeSeconds ?? 0;
  return sorted.map((car, index) => ({
    position: index + 1,
    car,
    gapToLeaderSeconds: car.totalTimeSeconds - leaderTime,
  }));
}
