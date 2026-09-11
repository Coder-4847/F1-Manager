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

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

const TICK_MS_BY_SPEED: Record<PlaybackSpeed, number> = {
  0.5: 900,
  1: 450,
  2: 220,
  4: 100,
};

export interface UseRaceOptions {
  track: Track;
  playerDriverId: string;
  playerStrategy: InitialStrategy;
}

export function useRace({ track, playerDriverId, playerStrategy }: UseRaceOptions) {
  const [raceState, setRaceState] = useState<RaceState>(() =>
    setupRace({ track, playerDriverId, playerStrategy })
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
    setRaceState(setupRace({ track, playerDriverId, playerStrategy }));
  }, [track, playerDriverId, playerStrategy]);

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
    setDrivingMode,
    queuePitStop,
    cancelPitStop,
  };
}
