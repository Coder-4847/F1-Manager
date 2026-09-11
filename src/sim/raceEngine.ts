import type { CarState, Driver, DrivingMode, LapEvent, PitStopPlan, RaceState, TireCompound, Track } from "./types";
import type { AIDecisionContext, InitialStrategy } from "./strategy";
import { calculateLapTime } from "./lapTime";
import { pitStopTimeLoss } from "./pitStop";
import { decideAIAction, generateAIStrategy } from "./strategy";
import { resolveOvertakeAttempt } from "./overtaking";
import { applyDamage, clearDamage, rollForDamage } from "./damage";
import { rollForWeatherChange, weatherLabel } from "./weather";
import { rollForPenalty } from "./penalties";
import { rollForRetirement } from "./retirement";
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
    penaltySeconds: 0,
  };
}

/**
 * A quick one-lap qualifying simulation — no tire wear or fuel, just combined car/driver
 * pace plus a modest random variance (so it's not a pure stat-sheet ranking every time),
 * returning driver ids fastest to slowest. This decides the starting grid; without it,
 * lap 1 order was arbitrary (roster order), which made every race play out the same way.
 */
function runQualifying(random: () => number): string[] {
  return [...drivers]
    .map((driver) => {
      const team = getTeam(driver.teamId);
      const pace = 0.5 * team.carPerformance + 0.5 * driver.stats.pace + (random() - 0.5) * 6;
      return { id: driver.id, pace };
    })
    .sort((a, b) => b.pace - a.pace)
    .map((entry) => entry.id);
}

export function setupRace(setup: RaceSetup): RaceState {
  const random = setup.random ?? Math.random;
  const gridOrder = runQualifying(random);
  const cars: CarState[] = drivers.map((driver) => {
    const isPlayer = driver.id === setup.playerDriverId;
    const strategy = isPlayer ? setup.playerStrategy : generateAIStrategy(driver, setup.track, random);
    const car = createCarState(driver, isPlayer, strategy);
    // A tiny, race-irrelevant time offset by grid slot — just enough to break the lap-0
    // "everyone's at 0.0s" tie in qualifying order instead of arbitrary roster order.
    car.totalTimeSeconds = gridOrder.indexOf(driver.id) * 0.001;
    return car;
  });

  return {
    track: setup.track,
    cars,
    currentLap: 0,
    finished: false,
    events: [],
    weather: "dry",
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
  penaltySeconds: number;
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

  const weatherChange = rollForWeatherChange(state.weather, random);
  if (weatherChange) {
    state.weather = weatherChange;
    lapEvents.push({
      type: "weather",
      lap: state.currentLap,
      driverId: "",
      message: `Weather shifts to ${weatherLabel(weatherChange)} — track conditions are changing!`,
    });
  }

  // Phase A: reactive AI calls + raw lap time / pit stop determination, no totals touched yet.
  const computed = new Map<string, LapCompute>();

  for (const car of state.cars) {
    if (car.finished) continue;

    const damageEvent = rollForDamage(car, state.weather, random);
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
        weather: state.weather,
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

    // Retirement is checked after driving mode is finalized for this lap (push mode is
    // one of its risk factors) but before anything else — a retiring car stops mid-lap,
    // no lap time, no pit stop, nothing further to compute for it.
    const retirement = rollForRetirement(car, state.weather, random);
    if (retirement) {
      car.finished = true;
      car.retired = true;
      car.retiredReason = retirement.reason;
      lapEvents.push({
        type: "retirement",
        lap: state.currentLap,
        driverId: car.driver.id,
        message: `${car.driver.name} retires from the race — ${retirement.reason.toLowerCase()}!`,
      });
      continue;
    }

    const penaltyEvent = rollForPenalty(car, random);
    if (penaltyEvent) {
      car.penaltySeconds += penaltyEvent.seconds;
      lapEvents.push({
        type: "penalty",
        lap: state.currentLap,
        driverId: car.driver.id,
        message: `${car.driver.name} handed a ${penaltyEvent.seconds}s time penalty — ${penaltyEvent.reason}.`,
      });
    }

    const duePitStop: PitStopPlan | undefined =
      car.pitPlan[0]?.lap === state.currentLap ? car.pitPlan.shift() : undefined;

    const rawLapTime = calculateLapTime(car, state.track, state.weather, random);
    const repaired = Boolean(duePitStop && car.pendingRepairSeconds !== undefined);
    const pitLoss = duePitStop
      ? pitStopTimeLoss(state.track, random) + (repaired ? car.pendingRepairSeconds! : 0)
      : undefined;

    computed.set(car.driver.id, {
      car,
      rawLapTime,
      duePitStop,
      pitLoss,
      repaired,
      penaltySeconds: penaltyEvent?.seconds ?? 0,
    });
  }

  // Phase B: resolve battles in track-position order (leader first) so a fresh
  // gap cascades correctly down a train of cars, then apply the final totals.
  const resolvedTotal = new Map<string, number>();

  orderBefore.forEach((driverId, index) => {
    const entry = computed.get(driverId);
    if (!entry) return; // already finished before this lap

    const { car, rawLapTime, duePitStop, pitLoss, repaired, penaltySeconds } = entry;
    const preTotal = preLap.get(driverId)!.totalTime;
    const naiveTotal = preTotal + rawLapTime + (pitLoss ?? 0) + penaltySeconds;

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

/**
 * Applies a pre-race plan (starting tires, driving mode, and pit stop schedule) to the
 * player's car. Only meaningful before the race has started (currentLap 0) — used by the
 * Racing Plan screen to turn the player's choices into the actual starting CarState.
 */
export function applyPlayerPlan(state: RaceState, plan: InitialStrategy): void {
  const car = getPlayerCar(state);
  if (!car) return;
  car.currentCompound = plan.startingCompound;
  car.drivingMode = plan.drivingMode;
  car.pitPlan = [...plan.pitPlan].sort((a, b) => a.lap - b.lap);
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

/**
 * Replaces the player car's entire remaining pit stop schedule at once — used by the
 * mid-race Revise Plan screen, where the player can queue up more than one future stop
 * (unlike `queuePlayerPitStop`, which only ever tracks a single pending stop).
 */
export function setPlayerPitPlan(state: RaceState, stops: PitStopPlan[]): void {
  const car = getPlayerCar(state);
  if (car) car.pitPlan = [...stops].sort((a, b) => a.lap - b.lap);
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

/**
 * Standings ordered by total race time (ascending) — retired cars are ranked below every
 * still-running/classified car (regardless of their frozen total time, which would
 * otherwise make an early retirement look like it's "leading"), ordered among themselves
 * by laps completed (most laps first, the standard DNF convention).
 */
export function getStandings(state: RaceState): StandingsRow[] {
  const active = state.cars.filter((c) => !c.retired).sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds);
  const retired = state.cars.filter((c) => c.retired).sort((a, b) => b.lapsCompleted - a.lapsCompleted);
  const ordered = [...active, ...retired];
  const leaderTime = active[0]?.totalTimeSeconds ?? 0;
  return ordered.map((car, index) => ({
    position: index + 1,
    car,
    gapToLeaderSeconds: car.totalTimeSeconds - leaderTime,
  }));
}

export interface FinalResultRow {
  position: number;
  car: CarState;
  gapToLeaderSeconds: number;
  bestLapSeconds: number | null;
}

/** The post-race classification: same ordering as getStandings, plus each car's best lap. */
export function getFinalResults(state: RaceState): FinalResultRow[] {
  return getStandings(state).map((row) => ({
    ...row,
    bestLapSeconds: row.car.lapTimes.length > 0 ? Math.min(...row.car.lapTimes) : null,
  }));
}
