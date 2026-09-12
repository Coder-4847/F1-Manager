import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyPlayerPlan,
  cancelPlayerPitStop,
  getStandings,
  queuePlayerPitStop,
  setPlayerDrivingMode,
  setPlayerPitPlan,
  setupRace,
  simulateLap,
} from "../sim/raceEngine";
import { weatherMismatch } from "../sim/weather";
import type { DrivingMode, PitStopPlan, RaceState, TireCompound, Track } from "../sim/types";
import type { InitialStrategy } from "../sim/strategy";
import type { TeamDevelopment } from "../sim/development";
import type { Difficulty } from "../sim/difficulty";
import type { GameSettings } from "../sim/settings";

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

// 1x ≈ 5 real seconds per simulated lap, so the live track view has enough
// time to visibly sweep the cars around the circuit each lap.
export const TICK_MS_BY_SPEED: Record<PlaybackSpeed, number> = {
  0.5: 10000,
  1: 5000,
  2: 2500,
  4: 1250,
};

export interface UseRaceOptions {
  initialTrack: Track;
  playerDriverId: string;
  playerStrategy: InitialStrategy;
  /** Development for the very first race only (lazy initial state, evaluated once at
   *  mount). `reset`/`switchTrack` take a fresh value explicitly instead of relying on a
   *  captured option — see the comment on `switchTrack` below for why that matters. */
  initialTeamDevelopment: Record<string, TeamDevelopment>;
  /** Difficulty for the very first race only (lazy initial state, evaluated once at mount) —
   *  same reasoning and the same explicit-argument treatment in `reset`/`switchTrack`. */
  initialDifficulty: Difficulty;
  /** Settings for the very first race only (lazy initial state, evaluated once at mount) —
   *  same reasoning and the same explicit-argument treatment in `reset`/`switchTrack`. */
  initialSettings: GameSettings;
}

/**
 * Owns the currently selected track itself (rather than taking it as a
 * reactive prop) so a loaded save's track and a manual track switch both
 * flow through the same single source of truth: raceState.track.
 */
export function useRace({
  initialTrack,
  playerDriverId,
  playerStrategy,
  initialTeamDevelopment,
  initialDifficulty,
  initialSettings,
}: UseRaceOptions) {
  const [raceState, setRaceState] = useState<RaceState>(() =>
    setupRace({
      track: initialTrack,
      playerDriverId,
      playerStrategy,
      teamDevelopment: initialTeamDevelopment,
      difficulty: initialDifficulty,
      settings: initialSettings,
    })
  );
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const intervalRef = useRef<number | null>(null);

  // True right after the player's car picks up serious (major/mechanical) new damage —
  // minor damage is logged but doesn't interrupt play, to keep alerts from piling up.
  const [damageAlert, setDamageAlert] = useState(false);
  // True right after the weather changes into something that actually invalidates the
  // player's current tire choice — a change that doesn't affect them doesn't interrupt.
  const [weatherAlert, setWeatherAlert] = useState(false);
  // True before every race until the player confirms a Racing Plan — playback
  // is blocked the same way, so the plan is always locked in before lights-out.
  const [planPending, setPlanPending] = useState(true);
  // True right after a Safety Car/VSC is freshly deployed — offers the discounted pit
  // window immediately, same pause/gate pattern as the other alerts.
  const [cautionAlert, setCautionAlert] = useState(false);

  // The highest lap number already checked for alert-worthy events. Deciding whether to
  // pop an alert lives in a useEffect (below), reacting to the *committed* raceState,
  // rather than inside the setRaceState updater itself — StrictMode calls that updater
  // twice in development with independent random rolls each time, and calling
  // setWeatherAlert/setDamageAlert as side effects from inside it means the discarded
  // first call's outcome could still fire a "phantom" alert for an event that never
  // actually happened in the committed state. This ref stops the effect from re-checking
  // (and re-alerting on) the same lap again for unrelated re-renders while sitting on it.
  const lastCheckedLapRef = useRef(0);

  const step = useCallback(() => {
    setRaceState((prev) => {
      if (prev.finished || planPending) return prev;
      // Cloning before simulateLap (which mutates in place) matters for the same
      // StrictMode reason: without a fresh clone each call, the second invocation would
      // mutate an already-mutated `prev` — advancing the race by two laps per tick.
      const next: RaceState = structuredClone(prev);
      simulateLap(next);
      return next;
    });
  }, [planPending]);

  // Reacts only to the actually-committed raceState, so it can't be fooled by a
  // StrictMode-duplicated, ultimately-discarded simulation.
  useEffect(() => {
    if (raceState.currentLap <= lastCheckedLapRef.current) return;
    lastCheckedLapRef.current = raceState.currentLap;

    const gotDamaged = raceState.events.some(
      (e) => e.type === "damage" && e.lap === raceState.currentLap && e.driverId === playerDriverId
    );
    const weatherChangedThisLap = raceState.events.some(
      (e) => e.type === "weather" && e.lap === raceState.currentLap
    );
    const playerCar = raceState.cars.find((c) => c.driver.id === playerDriverId);

    const seriousDamage =
      gotDamaged && (playerCar?.damageSeverity === "major" || playerCar?.damageSeverity === "mechanical");
    const weatherNowMismatched =
      weatherChangedThisLap &&
      playerCar !== undefined &&
      weatherMismatch(playerCar.currentCompound, raceState.weather) >= 1;
    // A caution just freshly deployed this lap has lapsRemaining still equal to its full
    // durationLaps — the decrement in simulateLap only ever applies to a caution that was
    // already active *before* the lap it's checking, so this is a reliable one-lap window.
    const cautionJustDeployed =
      raceState.caution !== null && raceState.caution.lapsRemaining === raceState.caution.durationLaps;

    if (seriousDamage || weatherNowMismatched || cautionJustDeployed) {
      setPlaying(false);
      if (weatherNowMismatched) setWeatherAlert(true);
      if (seriousDamage) setDamageAlert(true);
      if (cautionJustDeployed) setCautionAlert(true);
    }
  }, [raceState, playerDriverId]);

  useEffect(() => {
    if (!playing || damageAlert || weatherAlert || cautionAlert || planPending) return;
    intervalRef.current = window.setInterval(step, TICK_MS_BY_SPEED[speed]);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [playing, speed, step, damageAlert, weatherAlert, cautionAlert, planPending]);

  useEffect(() => {
    if (raceState.finished) setPlaying(false);
  }, [raceState.finished]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);

  // Both reset and switchTrack take `teamDevelopment` as an explicit argument rather than
  // closing over a hook option — useSeason calls these in the same tick it computes a new
  // SeasonState (completeRound/createSeason), before React re-renders useRace with a fresh
  // option value, so a captured option here would still read the *previous* round's
  // development. Passing it explicitly at the call site sidesteps that staleness entirely.
  const reset = useCallback(
    (teamDevelopment: Record<string, TeamDevelopment>, difficulty: Difficulty, settings: GameSettings) => {
      setPlaying(false);
      setDamageAlert(false);
      setWeatherAlert(false);
      setCautionAlert(false);
      setPlanPending(true);
      lastCheckedLapRef.current = 0;
      setRaceState((prev) =>
        setupRace({ track: prev.track, playerDriverId, playerStrategy, teamDevelopment, difficulty, settings })
      );
    },
    [playerDriverId, playerStrategy]
  );

  const switchTrack = useCallback(
    (track: Track, teamDevelopment: Record<string, TeamDevelopment>, difficulty: Difficulty, settings: GameSettings) => {
      setPlaying(false);
      setDamageAlert(false);
      setWeatherAlert(false);
      setCautionAlert(false);
      setPlanPending(true);
      lastCheckedLapRef.current = 0;
      setRaceState(setupRace({ track, playerDriverId, playerStrategy, teamDevelopment, difficulty, settings }));
    },
    [playerDriverId, playerStrategy]
  );

  /** Replaces the race state outright — used when loading a saved season/race, which is
   *  always already past the planning stage. */
  const restoreRaceState = useCallback((state: RaceState) => {
    setPlaying(false);
    setDamageAlert(false);
    setWeatherAlert(false);
    setCautionAlert(false);
    setPlanPending(false);
    // The loaded race may already be mid-race — mark everything up to its current lap as
    // already checked so we don't immediately re-alert on old, already-resolved events.
    lastCheckedLapRef.current = state.currentLap;
    setRaceState(state);
  }, []);

  const setDrivingMode = useCallback((mode: DrivingMode) => {
    setRaceState((prev) => {
      const next = structuredClone(prev);
      setPlayerDrivingMode(next, mode);
      return next;
    });
  }, []);

  const queuePitStop = useCallback((lap: number, compound: TireCompound) => {
    setRaceState((prev) => {
      const next = structuredClone(prev);
      queuePlayerPitStop(next, lap, compound);
      return next;
    });
  }, []);

  const cancelPitStop = useCallback(() => {
    setRaceState((prev) => {
      const next = structuredClone(prev);
      cancelPlayerPitStop(next);
      return next;
    });
  }, []);

  /** Replaces the player's entire remaining pit stop schedule — used by the mid-race Revise Plan screen. */
  const updatePitPlan = useCallback((stops: PitStopPlan[]) => {
    setRaceState((prev) => {
      const next = structuredClone(prev);
      setPlayerPitPlan(next, stops);
      return next;
    });
  }, []);

  /** Resolves a pending damage alert: pit next lap (repairs on arrival) or push through unrepaired. */
  const resolveDamage = useCallback((choice: "pit" | "push") => {
    if (choice === "pit") {
      setRaceState((prev) => {
        const next = structuredClone(prev);
        const car = next.cars.find((c) => c.isPlayer);
        if (car) queuePlayerPitStop(next, next.currentLap + 1, car.currentCompound);
        return next;
      });
    }
    setDamageAlert(false);
  }, []);

  /** Resolves a pending weather alert: pit next lap on the chosen compound, or push through as-is. */
  const resolveWeather = useCallback((choice: "pit" | "push", compound?: TireCompound) => {
    if (choice === "pit" && compound) {
      setRaceState((prev) => {
        const next = structuredClone(prev);
        queuePlayerPitStop(next, next.currentLap + 1, compound);
        return next;
      });
    }
    setWeatherAlert(false);
  }, []);

  /** Resolves a pending caution alert: grab the cheap pit window next lap on the current
   *  compound, or stay out and keep track position. */
  const resolveCaution = useCallback((choice: "pit" | "push") => {
    if (choice === "pit") {
      setRaceState((prev) => {
        const next = structuredClone(prev);
        const car = next.cars.find((c) => c.isPlayer);
        if (car) queuePlayerPitStop(next, next.currentLap + 1, car.currentCompound);
        return next;
      });
    }
    setCautionAlert(false);
  }, []);

  /** Locks in the player's pre-race plan (starting tires, mode, pit schedule) and unblocks playback. */
  const confirmPlan = useCallback((plan: InitialStrategy) => {
    setRaceState((prev) => {
      const next = structuredClone(prev);
      applyPlayerPlan(next, plan);
      return next;
    });
    setPlanPending(false);
  }, []);

  const playerCar = raceState.cars.find((c) => c.isPlayer);
  const standings = getStandings(raceState);

  return {
    raceState,
    standings,
    playerCar,
    playing,
    speed,
    tickDurationMs: TICK_MS_BY_SPEED[speed],
    damageAlert,
    weatherAlert,
    cautionAlert,
    planPending,
    setSpeed,
    play,
    pause,
    step,
    reset,
    switchTrack,
    restoreRaceState,
    setDrivingMode,
    queuePitStop,
    cancelPitStop,
    updatePitPlan,
    resolveDamage,
    resolveWeather,
    resolveCaution,
    confirmPlan,
  };
}
