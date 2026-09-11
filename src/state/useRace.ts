import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyPlayerPlan,
  cancelPlayerPitStop,
  getStandings,
  queuePlayerPitStop,
  setPlayerDrivingMode,
  setupRace,
  simulateLap,
} from "../sim/raceEngine";
import type { DrivingMode, RaceState, TireCompound, Track } from "../sim/types";
import type { InitialStrategy } from "../sim/strategy";

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
}

/**
 * Owns the currently selected track itself (rather than taking it as a
 * reactive prop) so a loaded save's track and a manual track switch both
 * flow through the same single source of truth: raceState.track.
 */
export function useRace({ initialTrack, playerDriverId, playerStrategy }: UseRaceOptions) {
  const [raceState, setRaceState] = useState<RaceState>(() =>
    setupRace({ track: initialTrack, playerDriverId, playerStrategy })
  );
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const intervalRef = useRef<number | null>(null);

  // True right after the player's car picks up new damage this lap — playback
  // pauses and stays paused until the player resolves it (pit or push through).
  const [damageAlert, setDamageAlert] = useState(false);
  // True right after the weather changes — same pause-until-resolved treatment.
  const [weatherAlert, setWeatherAlert] = useState(false);
  // True before every race until the player confirms a Racing Plan — playback
  // is blocked the same way, so the plan is always locked in before lights-out.
  const [planPending, setPlanPending] = useState(true);

  const step = useCallback(() => {
    setRaceState((prev) => {
      if (prev.finished || planPending) return prev;
      simulateLap(prev);
      const gotDamaged = prev.events.some(
        (e) => e.type === "damage" && e.lap === prev.currentLap && e.driverId === playerDriverId
      );
      const weatherChanged = prev.events.some((e) => e.type === "weather" && e.lap === prev.currentLap);
      if (gotDamaged || weatherChanged) {
        setPlaying(false);
        if (weatherChanged) setWeatherAlert(true);
        if (gotDamaged) setDamageAlert(true);
      }
      return { ...prev };
    });
  }, [playerDriverId, planPending]);

  useEffect(() => {
    if (!playing || damageAlert || weatherAlert || planPending) return;
    intervalRef.current = window.setInterval(step, TICK_MS_BY_SPEED[speed]);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [playing, speed, step, damageAlert, weatherAlert, planPending]);

  useEffect(() => {
    if (raceState.finished) setPlaying(false);
  }, [raceState.finished]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);

  const reset = useCallback(() => {
    setPlaying(false);
    setDamageAlert(false);
    setWeatherAlert(false);
    setPlanPending(true);
    setRaceState((prev) => setupRace({ track: prev.track, playerDriverId, playerStrategy }));
  }, [playerDriverId, playerStrategy]);

  const switchTrack = useCallback(
    (track: Track) => {
      setPlaying(false);
      setDamageAlert(false);
      setWeatherAlert(false);
      setPlanPending(true);
      setRaceState(setupRace({ track, playerDriverId, playerStrategy }));
    },
    [playerDriverId, playerStrategy]
  );

  /** Replaces the race state outright — used when loading a saved season/race, which is
   *  always already past the planning stage. */
  const restoreRaceState = useCallback((state: RaceState) => {
    setPlaying(false);
    setDamageAlert(false);
    setWeatherAlert(false);
    setPlanPending(false);
    setRaceState(state);
  }, []);

  const setDrivingMode = useCallback((mode: DrivingMode) => {
    setRaceState((prev) => {
      setPlayerDrivingMode(prev, mode);
      return { ...prev };
    });
  }, []);

  const queuePitStop = useCallback((lap: number, compound: TireCompound) => {
    setRaceState((prev) => {
      queuePlayerPitStop(prev, lap, compound);
      return { ...prev };
    });
  }, []);

  const cancelPitStop = useCallback(() => {
    setRaceState((prev) => {
      cancelPlayerPitStop(prev);
      return { ...prev };
    });
  }, []);

  /** Resolves a pending damage alert: pit next lap (repairs on arrival) or push through unrepaired. */
  const resolveDamage = useCallback((choice: "pit" | "push") => {
    if (choice === "pit") {
      setRaceState((prev) => {
        const car = prev.cars.find((c) => c.isPlayer);
        if (car) queuePlayerPitStop(prev, prev.currentLap + 1, car.currentCompound);
        return { ...prev };
      });
    }
    setDamageAlert(false);
  }, []);

  /** Resolves a pending weather alert: pit next lap on the chosen compound, or push through as-is. */
  const resolveWeather = useCallback((choice: "pit" | "push", compound?: TireCompound) => {
    if (choice === "pit" && compound) {
      setRaceState((prev) => {
        queuePlayerPitStop(prev, prev.currentLap + 1, compound);
        return { ...prev };
      });
    }
    setWeatherAlert(false);
  }, []);

  /** Locks in the player's pre-race plan (starting tires, mode, pit schedule) and unblocks playback. */
  const confirmPlan = useCallback((plan: InitialStrategy) => {
    setRaceState((prev) => {
      applyPlayerPlan(prev, plan);
      return { ...prev };
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
    resolveDamage,
    resolveWeather,
    confirmPlan,
  };
}
