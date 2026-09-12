import type { StandingsRow } from "./raceEngine";

// A fresh tactical target each round rather than one season-long goal — gives the
// player something concrete to play *for* beyond raw championship points, without
// requiring a whole meta-progression system. Gated by the Race Objectives setting.

export type ObjectiveKind =
  | "top-n-finish"
  | "beat-teammate"
  | "no-penalties"
  | "gain-positions"
  | "limited-pit-stops"
  | "fastest-lap";

export interface Objective {
  kind: ObjectiveKind;
  description: string;
  /** Parameter for kinds that need one (top-N position, min positions gained, max stops). */
  target?: number;
  rewardCredits: number;
}

const OBJECTIVE_POOL: (() => Objective)[] = [
  () => ({ kind: "top-n-finish", description: "Finish in the top 6.", target: 6, rewardCredits: 150 }),
  () => ({ kind: "beat-teammate", description: "Finish ahead of your teammate.", rewardCredits: 120 }),
  () => ({ kind: "no-penalties", description: "Complete the race with no time penalties.", rewardCredits: 130 }),
  () => ({
    kind: "gain-positions",
    description: "Gain at least 3 positions from your grid slot.",
    target: 3,
    rewardCredits: 160,
  }),
  () => ({
    kind: "limited-pit-stops",
    description: "Finish with no more than 2 pit stops.",
    target: 2,
    rewardCredits: 140,
  }),
  () => ({ kind: "fastest-lap", description: "Set the fastest lap of the race.", rewardCredits: 200 }),
];

export function generateObjective(random: () => number = Math.random): Objective {
  const pick = OBJECTIVE_POOL[Math.floor(random() * OBJECTIVE_POOL.length)];
  return pick();
}

/** Whether the player achieved a given objective, judged from the race's final standings.
 *  A retired player fails every objective outright — there's no partial credit for a DNF. */
export function evaluateObjective(objective: Objective, standings: StandingsRow[]): boolean {
  const playerRow = standings.find((row) => row.car.isPlayer);
  if (!playerRow || playerRow.car.retired) return false;
  const player = playerRow.car;

  switch (objective.kind) {
    case "top-n-finish":
      return playerRow.position <= (objective.target ?? 10);
    case "beat-teammate": {
      const teammateRow = standings.find((row) => row.car.team.id === player.team.id && !row.car.isPlayer);
      return teammateRow ? playerRow.position < teammateRow.position : false;
    }
    case "no-penalties":
      return player.penaltySeconds === 0;
    case "gain-positions":
      return player.startingPosition - playerRow.position >= (objective.target ?? 3);
    case "limited-pit-stops":
      return player.pitStopsMade <= (objective.target ?? 2);
    case "fastest-lap": {
      let bestId: string | null = null;
      let bestTime = Infinity;
      for (const row of standings) {
        if (row.car.lapTimes.length === 0) continue;
        const best = Math.min(...row.car.lapTimes);
        if (best < bestTime) {
          bestTime = best;
          bestId = row.car.driver.id;
        }
      }
      return bestId === player.driver.id;
    }
  }
}
