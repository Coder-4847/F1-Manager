import type { CarState, CautionPeriod, DownforceSetting, Driver, DrivingMode, FuelLoad, LapEvent, PitStopPlan, RaceState, TeamOrder, TireCompound, Track } from "./types";
import type { AIDecisionContext, InitialStrategy } from "./strategy";
import { calculateLapTime } from "./lapTime";
import { pitStopTimeLoss } from "./pitStop";
import { decideAIAction, generateAIStrategy } from "./strategy";
import { resolveOvertakeAttempt } from "./overtaking";
import { applyDamage, clearDamage, rollForDamage } from "./damage";
import { rollForWeatherChange, weatherLabel } from "./weather";
import { rollForPenalty } from "./penalties";
import { rollForRetirement } from "./retirement";
import {
  cautionLapTimeMultiplier,
  cautionPitLossMultiplier,
  rollCautionForDamage,
  rollCautionForRetirement,
  SC_GAP_CLOSURE_RATE,
  SC_MIN_GAP_SECONDS,
} from "./caution";
import { paceBonusForLevel, reliabilityMultiplierForLevel, tireWearMultiplierForLevel } from "./development";
import type { TeamDevelopment } from "./development";
import { AI_SPEED_MULTIPLIER } from "./difficulty";
import type { Difficulty } from "./difficulty";
import { DEFAULT_SETTINGS } from "./settings";
import type { GameSettings } from "./settings";
import { fuelBurnForLap, initialFuelRemaining } from "./fuel";
import { drivers, getTeam } from "./roster";

export interface RaceSetup {
  track: Track;
  /** driverId of the car the player controls. */
  playerDriverId: string;
  playerStrategy: InitialStrategy;
  /** This season's per-team development (pace/reliability/tire management + budget), keyed
   *  by team id. Omitted entirely (e.g. a standalone test setup) means no team has upgrades. */
  teamDevelopment?: Record<string, TeamDevelopment>;
  /** Defaults to "normal" (no AI pace change) when omitted, e.g. a standalone test setup. */
  difficulty?: Difficulty;
  /** Which optional systems are active this race. Defaults to everything on (DEFAULT_SETTINGS)
   *  when omitted, e.g. a standalone test setup. Baked into RaceState so a mid-race settings
   *  change never destabilizes a race already in progress — see difficulty for the same pattern. */
  settings?: GameSettings;
  random?: () => number;
}

/** A team's carPerformance with that round's pace development folded in — a car-scoped
 *  shallow copy, same reasoning as currentRoundTrack's per-round lap-count override: the
 *  shared roster.ts team objects are never mutated. */
function developedTeam(teamId: string, development?: TeamDevelopment) {
  const base = getTeam(teamId);
  if (!development) return base;
  return { ...base, carPerformance: base.carPerformance + paceBonusForLevel(development.paceLevel) };
}

function createCarState(
  driver: Driver,
  isPlayer: boolean,
  strategy: InitialStrategy,
  totalLaps: number,
  settings: GameSettings,
  development?: TeamDevelopment
): CarState {
  // Forced to "standard" (a no-op load) when the setting is off, rather than trusting
  // whatever the strategy object happens to carry — guards against a stale "light"/"heavy"
  // choice left over from before the player disabled the feature.
  const fuelLoad: FuelLoad = settings.fuelStrategyEnabled ? strategy.fuelLoad : "standard";
  const downforce: DownforceSetting = settings.setupTradeoffEnabled ? strategy.downforce : "balanced";
  return {
    driver,
    team: developedTeam(driver.teamId, development),
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
    reliabilityMultiplier: development ? reliabilityMultiplierForLevel(development.reliabilityLevel) : 1,
    tireWearMultiplier: development ? tireWearMultiplierForLevel(development.tireManagementLevel) : 1,
    fuelLoad,
    fuelRemaining: initialFuelRemaining(fuelLoad, totalLaps),
    fuelSaving: false,
    downforce,
    startingPosition: 0, // placeholder — setupRace fills this in once the grid order is known
  };
}

/**
 * A quick one-lap qualifying simulation — no tire wear or fuel, just combined car/driver
 * pace plus a modest random variance (so it's not a pure stat-sheet ranking every time),
 * returning driver ids fastest to slowest. This decides the starting grid; without it,
 * lap 1 order was arbitrary (roster order), which made every race play out the same way.
 */
function runQualifying(random: () => number, teamDevelopment?: Record<string, TeamDevelopment>): string[] {
  return [...drivers]
    .map((driver) => {
      const team = developedTeam(driver.teamId, teamDevelopment?.[driver.teamId]);
      const pace = 0.5 * team.carPerformance + 0.5 * driver.stats.pace + (random() - 0.5) * 6;
      return { id: driver.id, pace };
    })
    .sort((a, b) => b.pace - a.pace)
    .map((entry) => entry.id);
}

export function setupRace(setup: RaceSetup): RaceState {
  const random = setup.random ?? Math.random;
  const settings = setup.settings ?? DEFAULT_SETTINGS;
  const gridOrder = runQualifying(random, setup.teamDevelopment);
  const cars: CarState[] = drivers.map((driver) => {
    const isPlayer = driver.id === setup.playerDriverId;
    const strategy = isPlayer ? setup.playerStrategy : generateAIStrategy(driver, setup.track, random);
    const development = setup.teamDevelopment?.[driver.teamId];
    const car = createCarState(driver, isPlayer, strategy, setup.track.totalLaps, settings, development);
    // A tiny, race-irrelevant time offset by grid slot — just enough to break the lap-0
    // "everyone's at 0.0s" tie in qualifying order instead of arbitrary roster order.
    car.totalTimeSeconds = gridOrder.indexOf(driver.id) * 0.001;
    car.startingPosition = gridOrder.indexOf(driver.id) + 1;
    return car;
  });

  return {
    track: setup.track,
    cars,
    currentLap: 0,
    finished: false,
    events: [],
    weather: "dry",
    caution: null,
    difficulty: setup.difficulty ?? "normal",
    settings,
    teamOrder: null,
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

  // The caution controlling *this* lap's driving — set before this lap began, so a caution
  // triggered by something that happens during this same lap doesn't retroactively slow it
  // down; its effects start next lap instead (see the trigger/decrement logic below).
  const activeCaution = state.caution;
  let cautionTriggeredThisLap: CautionPeriod | null = null;

  // Resolved once per lap for the team-orders battle-resolution special-casing below —
  // null when the setting is off or the player has no teammate (shouldn't happen with the
  // current 2-drivers-per-team roster, but defensive).
  const player = state.cars.find((c) => c.isPlayer);
  const teammate = player ? state.cars.find((c) => c.team.id === player.team.id && c.driver.id !== player.driver.id) : undefined;
  const activeTeamOrder = state.settings.teamOrdersEnabled ? state.teamOrder : null;

  const weatherChange = state.settings.weatherEnabled ? rollForWeatherChange(state.weather, random) : null;
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

    // No new incidents while a caution is already out — the field is running slow and
    // spread out behind it, which is exactly why a caution suppresses further chaos.
    let damageEvent =
      activeCaution || !state.settings.damageEnabled ? null : rollForDamage(car, state.weather, random);
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
        caution: activeCaution?.type ?? null,
      };

      const decision = decideAIAction(car, ctx, random);
      car.drivingMode = decision.drivingMode;
      if (decision.pitCompound) {
        car.pitPlan = [{ lap: state.currentLap, compound: decision.pitCompound }];
      }
    }

    // Retirement is checked after driving mode is finalized for this lap (push mode is
    // one of its risk factors) but before anything else — a retiring car stops mid-lap,
    // no lap time, no pit stop, nothing further to compute for it. Suppressed under an
    // existing caution for the same reason as damage above.
    const retirement =
      activeCaution || !state.settings.retirementsEnabled ? null : rollForRetirement(car, state.weather, random);
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
      if (!cautionTriggeredThisLap && state.settings.cautionsEnabled) {
        cautionTriggeredThisLap = rollCautionForRetirement(random);
      }
      continue;
    }

    // A retirement always brings out at least a VSC, but a car that survives with serious
    // damage can also bring one out on its own (limping back, marshals clearing debris) —
    // strictly weaker than the retirement trigger above, so it never escalates to a full SC.
    if (!activeCaution && !cautionTriggeredThisLap && damageEvent && state.settings.cautionsEnabled) {
      cautionTriggeredThisLap = rollCautionForDamage(damageEvent.severity, random);
    }

    const penaltyEvent = activeCaution || !state.settings.penaltiesEnabled ? null : rollForPenalty(car, random);
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

    // Not replenished at pit stops — a whole-race budget, so running it dry is a lasting
    // consequence of driving-mode choices made across the whole race, not just this stint.
    if (state.settings.fuelStrategyEnabled) {
      car.fuelRemaining -= fuelBurnForLap(car.drivingMode);
      if (car.fuelRemaining <= 0 && !car.fuelSaving) {
        car.fuelSaving = true;
        lapEvents.push({
          type: "fuel",
          lap: state.currentLap,
          driverId: car.driver.id,
          message: `${car.driver.name} runs the fuel margin dry — forced into a fuel-saving lift-and-coast!`,
        });
      }
    }

    const lapTimeMultiplier = activeCaution ? cautionLapTimeMultiplier(activeCaution.type) : 1;
    // Difficulty scales AI pace only — a speed multiplier above 1 means faster, so it
    // divides into lap time rather than multiplying. The player is never affected.
    const difficultyMultiplier = car.isPlayer ? 1 : 1 / AI_SPEED_MULTIPLIER[state.difficulty];
    const rawLapTime = calculateLapTime(car, state.track, state.weather, random) * lapTimeMultiplier * difficultyMultiplier;
    const repaired = Boolean(duePitStop && car.pendingRepairSeconds !== undefined);
    const pitLossMultiplier = activeCaution ? cautionPitLossMultiplier(activeCaution.type) : 1;
    const pitLoss = duePitStop
      ? pitStopTimeLoss(state.track, random) * pitLossMultiplier + (repaired ? car.pendingRepairSeconds! : 0)
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

  if (cautionTriggeredThisLap) {
    state.caution = cautionTriggeredThisLap;
    lapEvents.push({
      type: "caution",
      lap: state.currentLap,
      driverId: "",
      message:
        cautionTriggeredThisLap.type === "sc"
          ? "Safety Car deployed! The field bunches up behind it."
          : "Virtual Safety Car deployed — hold your gap and cut your pace.",
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
      if (activeCaution) {
        // No overtaking under any caution — the field holds station. A full Safety Car
        // additionally bunches the queue up nose-to-tail over the caution's laps by
        // closing a chunk of each gap every lap, rather than snapping it shut instantly.
        if (activeCaution.type === "sc") {
          const gap = naiveTotal - aheadFinal;
          finalTotal = aheadFinal + Math.max(gap * (1 - SC_GAP_CLOSURE_RATE), SC_MIN_GAP_SECONDS);
        }
      } else {
        const isPlayerTeammatePair =
          teammate !== undefined &&
          ((car.isPlayer && aheadEntry.car.driver.id === teammate.driver.id) ||
            (aheadEntry.car.isPlayer && car.driver.id === teammate.driver.id));

        if (activeTeamOrder?.type === "hold" && isPlayerTeammatePair) {
          // Hold station: whichever of the two is currently trailing doesn't fight past
          // the other, regardless of who's actually quicker this lap — persists until
          // canceled, so no event is logged every lap it merely holds.
          finalTotal = Math.max(naiveTotal, aheadFinal + HELD_UP_GAP_SECONDS);
        } else if (
          activeTeamOrder?.type === "let-through" &&
          car.isPlayer &&
          aheadEntry.car.driver.id === teammate?.driver.id
        ) {
          // One-shot: the teammate concedes the position outright the moment the player is
          // actually running right behind them, then the order is consumed.
          finalTotal = Math.min(naiveTotal, aheadFinal - PASS_MARGIN_SECONDS);
          lapEvents.push({
            type: "team-order",
            lap: state.currentLap,
            driverId,
            message: `${aheadEntry.car.driver.name} lets ${car.driver.name} through under team orders!`,
          });
          state.teamOrder = null;
        } else if (
          activeTeamOrder?.type === "block" &&
          activeTeamOrder.targetDriverId === car.driver.id &&
          aheadEntry.car.driver.id === teammate?.driver.id
        ) {
          // The teammate is defending specifically against this rival on team orders — the
          // attacker has to win the overtake roll twice in a row to actually get through.
          const gap = naiveTotal - aheadFinal;
          if (Math.abs(gap) < BATTLE_ZONE_SECONDS) {
            const passed =
              resolveOvertakeAttempt(car, rawLapTime, aheadEntry.car, aheadEntry.rawLapTime, state.track, random) &&
              resolveOvertakeAttempt(car, rawLapTime, aheadEntry.car, aheadEntry.rawLapTime, state.track, random);
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
        } else {
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

  // Only count this lap against a caution that was already running before it started — a
  // caution triggered *this* lap (see cautionTriggeredThisLap above) starts its countdown
  // next lap instead, since this lap already played out at (mostly) racing speed.
  if (activeCaution && state.caution === activeCaution) {
    state.caution.lapsRemaining -= 1;
    if (state.caution.lapsRemaining <= 0) {
      state.caution = null;
      lapEvents.push({
        type: "caution",
        lap: state.currentLap,
        driverId: "",
        message: "Green flag! Racing resumes at full pace.",
      });
    }
  }

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
  // Re-derive the fuel budget from whatever load the player actually confirmed — the car
  // was first created with a placeholder strategy before the Racing Plan screen opened.
  car.fuelLoad = plan.fuelLoad;
  car.fuelRemaining = initialFuelRemaining(plan.fuelLoad, state.track.totalLaps);
  car.fuelSaving = false;
  car.downforce = plan.downforce;
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

/** Sets (or clears, with null) the player's standing radio order to their AI teammate —
 *  see the battle-resolution special-casing in simulateLap for what each order actually does. */
export function setPlayerTeamOrder(state: RaceState, order: TeamOrder | null): void {
  state.teamOrder = order;
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
