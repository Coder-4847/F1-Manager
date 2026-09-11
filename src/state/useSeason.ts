import { useCallback, useState } from "react";
import { useRace } from "./useRace";
import {
  completeRound,
  createSeason,
  currentRoundTrack,
  getConstructorStandings,
  getDriverStandings,
  isSeasonComplete,
} from "../sim/season";
import type { SeasonRound, SeasonState } from "../sim/season";
import type { InitialStrategy } from "../sim/strategy";
import { hasSeasonSave, loadSeasonProgress, saveSeasonProgress } from "./persistence";

export interface UseSeasonOptions {
  playerDriverId: string;
  playerStrategy: InitialStrategy;
}

export function useSeason({ playerDriverId, playerStrategy }: UseSeasonOptions) {
  const [season, setSeason] = useState<SeasonState>(() => createSeason());

  // Computed once, lazily, at mount — a fresh season's round 1 track is
  // always valid. Recomputing this from `season` on every render would crash
  // once the season completes and currentRoundTrack(season) becomes null.
  const [initialTrack] = useState(() => currentRoundTrack(season)!);
  const race = useRace({
    initialTrack,
    playerDriverId,
    playerStrategy,
  });

  const seasonComplete = isSeasonComplete(season);

  const advanceToNextRound = useCallback(() => {
    if (!race.raceState.finished || seasonComplete) return;
    const updated = completeRound(season, race.standings);
    setSeason(updated);
    const nextTrack = currentRoundTrack(updated);
    if (nextTrack) race.switchTrack(nextTrack);
  }, [race, season, seasonComplete]);

  // Restarts using the *current* calendar (default or custom) — a season built
  // via startCustomSeason stays the same shape when restarted, not the default 12.
  const restartSeason = useCallback(() => {
    const fresh = createSeason(season.calendar);
    setSeason(fresh);
    race.switchTrack(currentRoundTrack(fresh)!);
  }, [race, season.calendar]);

  const startCustomSeason = useCallback(
    (calendar: SeasonRound[]) => {
      const fresh = createSeason(calendar);
      setSeason(fresh);
      race.switchTrack(currentRoundTrack(fresh)!);
    },
    [race]
  );

  const [hasSave, setHasSave] = useState(() => hasSeasonSave());

  const saveProgress = useCallback(() => {
    saveSeasonProgress({ season, raceState: race.raceState });
    setHasSave(true);
  }, [season, race.raceState]);

  const loadProgress = useCallback(() => {
    const loaded = loadSeasonProgress();
    if (loaded) {
      setSeason(loaded.season);
      race.restoreRaceState(loaded.raceState);
    }
  }, [race]);

  return {
    season,
    race,
    seasonComplete,
    driverStandings: getDriverStandings(season),
    constructorStandings: getConstructorStandings(season),
    advanceToNextRound,
    restartSeason,
    startCustomSeason,
    hasSave,
    saveProgress,
    loadProgress,
  };
}
