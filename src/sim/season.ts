import type { StandingsRow } from "./raceEngine";
import { drivers, getTeam } from "./roster";
import { getTrack, tracks } from "./tracks";
import type { Track } from "./types";

const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export function pointsForPosition(position: number): number {
  return POINTS_TABLE[position - 1] ?? 0;
}

export interface SeasonRound {
  trackId: string;
  /** Laps for this round — independent of the track's own default totalLaps, so a
   *  custom season can shorten/lengthen a race without altering the track itself. */
  laps: number;
}

export interface RoundResult {
  trackId: string;
  trackName: string;
  standings: { driverId: string; position: number; points: number }[];
}

export interface SeasonState {
  calendar: SeasonRound[];
  /** Index into `calendar` of the round currently being raced (or next up). */
  roundIndex: number;
  driverPoints: Record<string, number>;
  results: RoundResult[];
}

export function defaultCalendar(): SeasonRound[] {
  return tracks.map((t) => ({ trackId: t.id, laps: t.totalLaps }));
}

export function createSeason(calendar: SeasonRound[] = defaultCalendar()): SeasonState {
  return {
    calendar,
    roundIndex: 0,
    driverPoints: Object.fromEntries(drivers.map((d) => [d.id, 0])),
    results: [],
  };
}

export function isSeasonComplete(season: SeasonState): boolean {
  return season.roundIndex >= season.calendar.length;
}

export function currentRound(season: SeasonState): SeasonRound | null {
  return isSeasonComplete(season) ? null : season.calendar[season.roundIndex];
}

/** The track for the current round, with that round's custom lap count applied on top of
 *  the track's normal data — a shallow copy, so the shared track registry is never mutated
 *  (the same track can appear more than once in a calendar with a different lap count each time). */
export function currentRoundTrack(season: SeasonState): Track | null {
  const round = currentRound(season);
  return round ? { ...getTrack(round.trackId), totalLaps: round.laps } : null;
}

/** Records a finished race's standings into the season and advances to the next round. */
export function completeRound(season: SeasonState, standings: StandingsRow[]): SeasonState {
  const round = currentRound(season);
  if (!round) return season;

  const roundStandings = standings.map((row) => ({
    driverId: row.car.driver.id,
    position: row.position,
    points: row.car.retired ? 0 : pointsForPosition(row.position),
  }));

  const driverPoints = { ...season.driverPoints };
  for (const entry of roundStandings) {
    driverPoints[entry.driverId] = (driverPoints[entry.driverId] ?? 0) + entry.points;
  }

  const result: RoundResult = {
    trackId: round.trackId,
    trackName: getTrack(round.trackId).name,
    standings: roundStandings,
  };

  return {
    ...season,
    roundIndex: season.roundIndex + 1,
    driverPoints,
    results: [...season.results, result],
  };
}

export interface DriverStandingRow {
  position: number;
  driverId: string;
  driverName: string;
  teamName: string;
  points: number;
}

export function getDriverStandings(season: SeasonState): DriverStandingRow[] {
  return drivers
    .map((d) => ({
      driverId: d.id,
      driverName: d.name,
      teamName: getTeam(d.teamId).name,
      points: season.driverPoints[d.id] ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ position: i + 1, ...row }));
}

export interface ConstructorStandingRow {
  position: number;
  teamId: string;
  teamName: string;
  points: number;
}

export function getConstructorStandings(season: SeasonState): ConstructorStandingRow[] {
  const totals = new Map<string, number>();
  for (const d of drivers) {
    totals.set(d.teamId, (totals.get(d.teamId) ?? 0) + (season.driverPoints[d.id] ?? 0));
  }
  return [...totals.entries()]
    .map(([teamId, points]) => ({ teamId, teamName: getTeam(teamId).name, points }))
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ position: i + 1, ...row }));
}
