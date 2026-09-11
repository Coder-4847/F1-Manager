import type { CarState, Driver, LapEvent, PitStopPlan, RaceState, Track } from "./types";
import type { InitialStrategy } from "./strategy";
import { calculateLapTime } from "./lapTime";
import { pitStopTimeLoss } from "./pitStop";
import { generateAIStrategy } from "./strategy";
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

/** Advances every car by exactly one lap, mutating and returning the same RaceState. */
export function simulateLap(state: RaceState, random: () => number = Math.random): RaceState {
  if (state.finished) return state;

  state.currentLap += 1;
  const lapEvents: LapEvent[] = [];
  let fastestLap = { driverId: "", time: Infinity };

  for (const car of state.cars) {
    if (car.finished) continue;

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

  state.events.push(...lapEvents);

  if (state.cars.every((c) => c.finished)) {
    state.finished = true;
  }

  return state;
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
