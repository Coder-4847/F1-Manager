import type { CarState, Driver, DrivingMode, LapEvent, PitStopPlan, RaceState, TireCompound, Track } from "./types";
import type { AIDecisionContext, InitialStrategy } from "./strategy";
import { calculateLapTime } from "./lapTime";
import { pitStopTimeLoss } from "./pitStop";
import { decideAIAction, generateAIStrategy } from "./strategy";
import { resolveOvertakeAttempt } from "./overtaking";
import { applyDamage, clearDamage, rollForDamage } from "./damage";
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
    damagePenaltySeconds: 0,
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

/** Gap (seconds) within which two cars are considered to be fighting for the same piece of track this lap. */
const BATTLE_ZONE_SECONDS = 0.8;
/** How far ahead a successful attacker ends up once the move is completed. */
const PASS_MARGIN_SECONDS = 0.15;
/** How far behind a defended attacker is held — the "stuck in dirty air" tax. */
const HELD_UP_GAP_SECONDS = 0.35;

interface LapCompute {
  car: CarState;
  rawLapTime: number;
  duePitStop?: PitStopPlan;
  pitLoss?: number;
  repaired?: boolean;
}

/** Advances every car by exactly one lap, mutating and returning the same RaceState. */
export function simulateLap(state: RaceState, random: () => number = Math.random): RaceState {
  if (state.finished) return state;

  const orderBefore = orderByTime(state);

  // Snapshot pre-lap totals/tire ages so AI decisions and battle resolution this
  // lap all see the same "entering this lap" picture, regardless of processing order.
  const preLap = new Map(state.cars.map((c) => [c.driver.id, { totalTime: c.totalTimeSeconds, tireAge: c.tireAge }]));

  state.currentLap += 1;
  const lapEvents: LapEvent[] = [];

  // Phase A: reactive AI calls + raw lap time / pit stop determination, no totals touched yet.
  const computed = new Map<string, LapCompute>();

  for (const car of state.cars) {
    if (car.finished) continue;

    const damageEvent = rollForDamage(car, random);
    if (damageEvent) {
      applyDamage(car, damageEvent);
      lapEvents.push({
        type: "damage",
        lap: state.currentLap,
        driverId: car.driver.id,
        message: `${car.driver.name} suffers ${damageEvent.label.toLowerCase()}!`,
      });
    }

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

    const rawLapTime = calculateLapTime(car, state.track, random);
    const repaired = Boolean(duePitStop && car.pendingRepairSeconds !== undefined);
    const pitLoss = duePitStop
      ? pitStopTimeLoss(state.track, random) + (repaired ? car.pendingRepairSeconds! : 0)
      : undefined;

    computed.set(car.driver.id, { car, rawLapTime, duePitStop, pitLoss, repaired });
  }

  // Phase B: resolve battles in track-position order (leader first) so a fresh
  // gap cascades correctly down a train of cars, then apply the final totals.
  const resolvedTotal = new Map<string, number>();

  orderBefore.forEach((driverId, index) => {
    const entry = computed.get(driverId);
    if (!entry) return; // already finished before this lap

    const { car, rawLapTime, duePitStop, pitLoss, repaired } = entry;
    const preTotal = preLap.get(driverId)!.totalTime;
    const naiveTotal = preTotal + rawLapTime + (pitLoss ?? 0);

    let finalTotal = naiveTotal;

    const aheadId = index > 0 ? orderBefore[index - 1] : null;
    const aheadEntry = aheadId ? computed.get(aheadId) : undefined;
    const aheadFinal = aheadId ? resolvedTotal.get(aheadId) : undefined;

    if (!duePitStop && aheadEntry && !aheadEntry.duePitStop && aheadFinal !== undefined) {
      const gap = naiveTotal - aheadFinal;
      if (Math.abs(gap) < BATTLE_ZONE_SECONDS) {
        const passed = resolveOvertakeAttempt(
          car,
          rawLapTime,
          aheadEntry.car,
          aheadEntry.rawLapTime,
          state.track,
          random
        );
        if (passed) {
          finalTotal = Math.min(naiveTotal, aheadFinal - PASS_MARGIN_SECONDS);
          lapEvents.push({
            type: "overtake",
            lap: state.currentLap,
            driverId,
            message: `${car.driver.name} passes ${aheadEntry.car.driver.name} for position!`,
          });
        } else {
          finalTotal = Math.max(naiveTotal, aheadFinal + HELD_UP_GAP_SECONDS);
        }
      }
    }

    resolvedTotal.set(driverId, finalTotal);

    car.totalTimeSeconds = finalTotal;
    car.lapTimes.push(rawLapTime);
    car.tireAge += 1;
    car.lapsCompleted += 1;

    if (duePitStop) {
      car.currentCompound = duePitStop.compound;
      car.tireAge = 0;
      car.pitStopsMade += 1;
      if (repaired) clearDamage(car);
      lapEvents.push({
        type: "pit-stop",
        lap: state.currentLap,
        driverId,
        message: repaired
          ? `${car.driver.name} pits for ${duePitStop.compound} tires and repairs damage (+${(pitLoss ?? 0).toFixed(1)}s)`
          : `${car.driver.name} pits for ${duePitStop.compound} tires (+${(pitLoss ?? 0).toFixed(1)}s)`,
      });
    }

    if (car.lapsCompleted >= state.track.totalLaps) {
      car.finished = true;
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
 * Only one pending stop is tracked at a time — calling this again before the scheduled
 * lap overrides it (e.g. changing your mind about the compound).
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

/** Standings ordered by total race time (ascending). */
export function getStandings(state: RaceState): StandingsRow[] {
  const sorted = [...state.cars].sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds);
  const leaderTime = sorted[0]?.totalTimeSeconds ?? 0;
  return sorted.map((car, index) => ({
    position: index + 1,
    car,
    gapToLeaderSeconds: car.totalTimeSeconds - leaderTime,
  }));
}
