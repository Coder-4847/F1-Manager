import { useCallback, useState } from "react";
import { useRace } from "./useRace";
import {
  completeRound,
  createSeason,
  currentRoundTrack,
  getConstructorStandings,
  getDriverStandings,
  isSeasonComplete,
  purchaseTeamUpgrade,
} from "../sim/season";
import type { SeasonRound, SeasonState } from "../sim/season";
import type { InitialStrategy } from "../sim/strategy";
import type { UpgradeCategory } from "../sim/development";
import { getDriver } from "../sim/roster";
import { hasSeasonSave, loadSeasonProgress, saveSeasonProgress } from "./persistence";

export interface UseSeasonOptions {
  playerDriverId: string;
  playerStrategy: InitialStrategy;
}

export function useSeason({ playerDriverId, playerStrategy }: UseSeasonOptions) {
  const [season, setSeason] = useState<SeasonState>(() => createSeason());
  const playerTeamId = getDriver(playerDriverId).teamId;

  // Computed once, lazily, at mount — a fresh season's round 1 track is
  // always valid. Recomputing this from `season` on every render would crash
  // once the season completes and currentRoundTrack(season) becomes null.
  const [initialTrack] = useState(() => currentRoundTrack(season)!);
  const race = useRace({
    initialTrack,
    playerDriverId,
    playerStrategy,
    initialTeamDevelopment: season.teamDevelopment,
  });

  const seasonComplete = isSeasonComplete(season);

  const advanceToNextRound = useCallback(() => {
    if (!race.raceState.finished || seasonComplete) return;
    const updated = completeRound(season, race.standings);
    setSeason(updated);
    const nextTrack = currentRoundTrack(updated);
    if (nextTrack) race.switchTrack(nextTrack, updated.teamDevelopment);
  }, [race, season, seasonComplete]);

  // Restarts using the *current* calendar (default or custom) — a season built
  // via startCustomSeason stays the same shape when restarted, not the default 12.
  const restartSeason = useCallback(() => {
    const fresh = createSeason(season.calendar);
    setSeason(fresh);
    race.switchTrack(currentRoundTrack(fresh)!, fresh.teamDevelopment);
  }, [race, season.calendar]);

  const startCustomSeason = useCallback(
    (calendar: SeasonRound[]) => {
      const fresh = createSeason(calendar);
      setSeason(fresh);
      race.switchTrack(currentRoundTrack(fresh)!, fresh.teamDevelopment);
    },
    [race]
  );

  /** Buys one level of a development category for the player's own team. */
  const purchaseUpgrade = useCallback(
    (category: UpgradeCategory) => {
      setSeason((prev) => purchaseTeamUpgrade(prev, playerTeamId, category));
    },
    [playerTeamId]
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
    playerTeamId,
    driverStandings: getDriverStandings(season),
    constructorStandings: getConstructorStandings(season),
    advanceToNextRound,
    restartSeason,
    startCustomSeason,
    purchaseUpgrade,
    hasSave,
    saveProgress,
    loadProgress,
  };
}
