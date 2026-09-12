import type { StandingsRow } from "./raceEngine";
import { drivers, getTeam, teams } from "./roster";
import { getTrack, tracks } from "./tracks";
import type { Track } from "./types";
import { aiAutoSpend, createInitialDevelopment, purchaseUpgrade } from "./development";
import type { TeamDevelopment, UpgradeCategory } from "./development";

const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export function pointsForPosition(position: number): number {
  return POINTS_TABLE[position - 1] ?? 0;
}

// A per-race payout, not a real-world prize fund figure — every position earns something
// (unlike points, which run dry after 10th) so every team's budget grows every round,
// just much faster for whoever's running at the front.
const PRIZE_TABLE = [500, 400, 350, 300, 260, 220, 190, 160, 130, 100, 80, 60, 45, 30, 20, 10];

export function prizeForPosition(position: number): number {
  return PRIZE_TABLE[position - 1] ?? PRIZE_TABLE[PRIZE_TABLE.length - 1];
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
  /** Per-team budget + upgrade levels, keyed by team id. Resets with every new/restarted
   *  season — see completeRound for how it grows and development.ts for what it does. */
  teamDevelopment: Record<string, TeamDevelopment>;
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
    teamDevelopment: createInitialDevelopment(teams.map((t) => t.id)),
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

/**
 * Records a finished race's standings into the season, pays out prize money to every
 * team (summed across both its drivers — a shared team budget, not a per-driver one),
 * lets every AI-controlled team auto-invest its new budget, and advances to the next round.
 * The player's own team is excluded from auto-spend — they manage it themselves via the
 * Team Development screen, using whatever budget accumulates here.
 */
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

  const prizeByTeam = new Map<string, number>();
  for (const row of standings) {
    const prize = row.car.retired ? 0 : prizeForPosition(row.position);
    prizeByTeam.set(row.car.team.id, (prizeByTeam.get(row.car.team.id) ?? 0) + prize);
  }
  const playerTeamId = standings.find((row) => row.car.isPlayer)?.car.team.id;

  const teamDevelopment = { ...season.teamDevelopment };
  for (const [teamId, prize] of prizeByTeam) {
    const current = teamDevelopment[teamId] ?? { budget: 0, paceLevel: 0, reliabilityLevel: 0, tireManagementLevel: 0 };
    const withPrize = { ...current, budget: current.budget + prize };
    teamDevelopment[teamId] = teamId === playerTeamId ? withPrize : aiAutoSpend(withPrize);
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
    teamDevelopment,
  };
}

/** Buys one level of a category for a team, returning a new SeasonState — a no-op
 *  (returns the same season) if that team can't afford it or is already maxed out. */
export function purchaseTeamUpgrade(season: SeasonState, teamId: string, category: UpgradeCategory): SeasonState {
  const current = season.teamDevelopment[teamId];
  if (!current) return season;
  const updated = purchaseUpgrade(current, category);
  if (updated === current) return season;
  return { ...season, teamDevelopment: { ...season.teamDevelopment, [teamId]: updated } };
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
