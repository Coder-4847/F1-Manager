import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelPlayerPitStop,
  getStandings,
  queuePlayerPitStop,
  setPlayerDrivingMode,
  setupRace,
  simulateLap,
} from "../sim/raceEngine";
import type { DrivingMode, RaceState, TireCompound, Track } from "../sim/types";
import type { InitialStrategy } from "../sim/strategy";
import { getTrack } from "../sim/tracks";

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

const TICK_MS_BY_SPEED: Record<PlaybackSpeed, number> = {
  0.5: 900,
  1: 450,
  2: 220,
  4: 100,
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

  const step = useCallback(() => {
    setRaceState((prev) => {
      if (prev.finished) return prev;
      simulateLap(prev);
      return { ...prev };
    });
  }, []);

  useEffect(() => {
    if (!playing) return;
    intervalRef.current = window.setInterval(step, TICK_MS_BY_SPEED[speed]);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [playing, speed, step]);

  useEffect(() => {
    if (raceState.finished) setPlaying(false);
  }, [raceState.finished]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);

  const reset = useCallback(() => {
    setPlaying(false);
    setRaceState((prev) => setupRace({ track: prev.track, playerDriverId, playerStrategy }));
  }, [playerDriverId, playerStrategy]);

  const switchTrack = useCallback(
    (trackId: string) => {
      setPlaying(false);
      setRaceState(setupRace({ track: getTrack(trackId), playerDriverId, playerStrategy }));
    },
    [playerDriverId, playerStrategy]
  );

  /** Replaces the race state outright — used when loading a saved season/race. */
  const restoreRaceState = useCallback((state: RaceState) => {
    setPlaying(false);
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

  const playerCar = raceState.cars.find((c) => c.isPlayer);
  const standings = getStandings(raceState);

  return {
    raceState,
    standings,
    playerCar,
    playing,
    speed,
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
  };
}
