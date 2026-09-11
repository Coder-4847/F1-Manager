import type { CarState, Driver, DrivingMode, PitStopPlan, TireCompound, Track, WeatherCondition } from "./types";
import { tireWearPercent } from "./tires";
import { weatherMismatch } from "./weather";

export interface InitialStrategy {
  startingCompound: TireCompound;
  /** Pre-set pit stops queued before the race starts. AI cars start with none — Phase 3 decides pit calls reactively, lap by lap. The player can still pre-queue one via the UI. */
  pitPlan: PitStopPlan[];
  drivingMode: DrivingMode;
}

/**
 * Phase 3 AI: only the starting compound + opening driving mode are decided
 * up front now. Pit calls are made reactively each lap by decideAIAction.
 */
export function generateAIStrategy(driver: Driver, _track: Track, random: () => number = Math.random): InitialStrategy {
  const aggressive = driver.stats.aggression >= 65;
  const startingCompound: TireCompound = aggressive ? "soft" : random() < 0.5 ? "medium" : "soft";
  const drivingMode: DrivingMode = aggressive ? "push" : random() < 0.3 ? "conserve" : "balanced";

  return { startingCompound, pitPlan: [], drivingMode };
}

export interface AIDecisionContext {
  track: Track;
  weather: WeatherCondition;
  /** Gap to the car directly ahead in the standings, seconds. Null if leading. */
  gapAheadSeconds: number | null;
  /** Gap to the car directly behind, seconds. Null if last. */
  gapBehindSeconds: number | null;
  /** Tire age (laps) of the car directly ahead, from before this lap. Null if leading. */
  aheadTireAge: number | null;
  /** Tire age (laps) of the car directly behind, from before this lap. Null if last. */
  behindTireAge: number | null;
}

export interface AIAction {
  pitCompound?: TireCompound;
  drivingMode: DrivingMode;
}

const BASE_PIT_THRESHOLD = 72;
const MIN_STINT_LAPS = 8;
const CLOSE_GAP_SECONDS = 3;
const BATTLE_GAP_SECONDS = 1.5;

/** Slick choice when it's dry — unchanged from the original dry-only logic. */
function pickSlickCompound(lapsRemaining: number, aggression: number, random: () => number): TireCompound {
  if (lapsRemaining <= 16) return random() < 0.5 ? "medium" : "soft";
  if (aggression >= 65) return "soft";
  if (aggression <= 40) return "hard";
  return "medium";
}

/** Picks a pit compound appropriate for current conditions — wets/inters when it's wet/damp, otherwise the usual dry-tire logic. */
function pickCompoundForWeather(
  weather: WeatherCondition,
  lapsRemaining: number,
  aggression: number,
  random: () => number
): TireCompound {
  if (weather === "wet") return "wet";
  if (weather === "damp") return "intermediate";
  return pickSlickCompound(lapsRemaining, aggression, random);
}

/**
 * Reactive per-lap strategy call for one AI car. Looks at tire wear plus the
 * gaps/tire ages of the cars immediately ahead and behind to decide whether
 * to pit this lap and what driving mode to run. Deliberately simple — a
 * handful of heuristics, not an optimizer — but it reacts to the live race
 * instead of following a plan fixed before lights-out.
 */
export function decideAIAction(car: CarState, ctx: AIDecisionContext, random: () => number = Math.random): AIAction {
  const lapsRemaining = ctx.track.totalLaps - car.lapsCompleted;
  const wearPct = tireWearPercent(car.currentCompound, car.tireAge);

  let threshold =
    BASE_PIT_THRESHOLD - (car.driver.stats.aggression - 50) * 0.3 + (car.driver.stats.tireManagement - 50) * 0.2;

  // Undercut: the car ahead is close and on more worn tires — pit early to jump them.
  if (
    ctx.gapAheadSeconds !== null &&
    ctx.gapAheadSeconds < CLOSE_GAP_SECONDS &&
    ctx.aheadTireAge !== null &&
    ctx.aheadTireAge > car.tireAge + 3
  ) {
    threshold -= 10;
  }

  // Cover: the car behind is close and already on fresher tires — react before they undercut further.
  if (
    ctx.gapBehindSeconds !== null &&
    ctx.gapBehindSeconds < CLOSE_GAP_SECONDS &&
    ctx.behindTireAge !== null &&
    ctx.behindTireAge < car.tireAge - 5
  ) {
    threshold -= 8;
  }

  threshold = Math.max(55, Math.min(92, threshold));

  // Damage changes the calculus: major/mechanical damage is urgent enough to pit
  // immediately regardless of tire life, and even minor damage nudges the car
  // toward pitting sooner than tire wear alone would call for.
  const urgentDamage = car.damageSeverity === "major" || car.damageSeverity === "mechanical";
  if (car.damageSeverity === "minor") threshold -= 15;

  // A badly wrong tire for the conditions (e.g. slicks in heavy rain) is urgent enough
  // to pit for regardless of tire life; a one-step mismatch just makes it more likely.
  const weatherGap = weatherMismatch(car.currentCompound, ctx.weather);
  const urgentWeather = weatherGap >= 2;
  if (weatherGap === 1) threshold -= 20;

  // Even in an urgent situation, not every car commits to pitting immediately — real
  // teams sometimes gamble on staying out, more often the more aggressive the driver
  // is. Re-rolled every lap the situation persists, so nobody gambles forever: some
  // cars pit straight away, others hold out a lap or two, just like a real race.
  const urgent = urgentDamage || urgentWeather;
  const gambleChance = 0.15 + (car.driver.stats.aggression / 100) * 0.35;
  const commitsToPit = !urgent || random() >= gambleChance;

  const lateRaceGuard = lapsRemaining <= 4 && wearPct < 92;
  const shouldPit =
    (urgent && commitsToPit) || (car.tireAge >= MIN_STINT_LAPS && !lateRaceGuard && wearPct >= threshold);

  let pitCompound: TireCompound | undefined;
  if (shouldPit) {
    pitCompound = pickCompoundForWeather(ctx.weather, lapsRemaining, car.driver.stats.aggression, random);
  }

  const inBattle =
    (ctx.gapAheadSeconds !== null && ctx.gapAheadSeconds < BATTLE_GAP_SECONDS) ||
    (ctx.gapBehindSeconds !== null && ctx.gapBehindSeconds < BATTLE_GAP_SECONDS);

  let drivingMode: DrivingMode = "balanced";
  if (inBattle && wearPct < 70) {
    drivingMode = "push";
  } else if (wearPct > 60 && !shouldPit) {
    drivingMode = "conserve";
  }

  return { pitCompound, drivingMode };
}
