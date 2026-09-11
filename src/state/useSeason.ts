import { useCallback, useState } from "react";
import { useRace } from "./useRace";
import {
  completeRound,
  createSeason,
  currentRoundTrackId,
  getConstructorStandings,
  getDriverStandings,
  isSeasonComplete,
} from "../sim/season";
import type { SeasonState } from "../sim/season";
import { getTrack } from "../sim/tracks";
import type { InitialStrategy } from "../sim/strategy";
import { hasSeasonSave, loadSeasonProgress, saveSeasonProgress } from "./persistence";

export interface UseSeasonOptions {
  playerDriverId: string;
  playerStrategy: InitialStrategy;
}

export function useSeason({ playerDriverId, playerStrategy }: UseSeasonOptions) {
  const [season, setSeason] = useState<SeasonState>(() => createSeason());

  // Computed once, lazily, at mount — a fresh season's round 1 track id is
  // always valid. Recomputing this from `season` on every render would crash
  // once the season completes and currentRoundTrackId(season) becomes null.
  const [initialTrackId] = useState(() => currentRoundTrackId(season)!);
  const race = useRace({
    initialTrack: getTrack(initialTrackId),
    playerDriverId,
    playerStrategy,
  });

  const seasonComplete = isSeasonComplete(season);

  const advanceToNextRound = useCallback(() => {
    if (!race.raceState.finished || seasonComplete) return;
    const updated = completeRound(season, race.standings);
    setSeason(updated);
    const nextTrackId = currentRoundTrackId(updated);
    if (nextTrackId) race.switchTrack(nextTrackId);
  }, [race, season, seasonComplete]);

  const restartSeason = useCallback(() => {
    const fresh = createSeason();
    setSeason(fresh);
    race.switchTrack(currentRoundTrackId(fresh)!);
  }, [race]);

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
    hasSave,
    saveProgress,
    loadProgress,
  };
}
