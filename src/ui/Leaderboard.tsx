import { motion } from "framer-motion";
import type { StandingsRow } from "../sim/raceEngine";
import type { LapEvent } from "../sim/types";
import { TireBadge } from "./TireBadge";

function formatGap(row: StandingsRow): string {
  if (row.car.retired) return "DNF";
  if (row.position === 1) return "Leader";
  return `+${row.gapToLeaderSeconds.toFixed(1)}s`;
}

export interface LeaderboardProps {
  standings: StandingsRow[];
  currentLap: number;
  events: LapEvent[];
}

export function Leaderboard({ standings, currentLap, events }: LeaderboardProps) {
  const justPittedIds = new Set(
    events.filter((e) => e.type === "pit-stop" && e.lap === currentLap).map((e) => e.driverId)
  );

  return (
    <div className="leaderboard" role="table">
      <div className="leaderboard__row leaderboard__row--head" role="row">
        <span>Pos</span>
        <span>Driver</span>
        <span>Team</span>
        <span>Tires</span>
        <span>Gap</span>
        <span>Interval</span>
        <span>Stops</span>
      </div>
      {standings.map((row, i) => {
        const ahead = standings[i - 1];
        const interval = ahead ? row.car.totalTimeSeconds - ahead.car.totalTimeSeconds : 0;
        const justPitted = justPittedIds.has(row.car.driver.id);
        return (
          <motion.div
            key={row.car.driver.id}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            role="row"
            className={
              "leaderboard__row" +
              (row.car.isPlayer ? " player-row" : "") +
              (justPitted ? " leaderboard__row--pit-flash" : "") +
              (row.car.retired ? " leaderboard__row--dnf" : "")
            }
          >
            <span>{row.car.retired ? "DNF" : row.position}</span>
            <span>
              {row.car.driver.name}
              {row.car.damageSeverity && (
                <span
                  className={`damage-indicator damage-indicator--${row.car.damageSeverity}`}
                  title={row.car.damageLabel}
                >
                  ⚠
                </span>
              )}
            </span>
            <span>{row.car.team.name}</span>
            <span>
              <TireBadge compound={row.car.currentCompound} tireAge={row.car.tireAge} />
            </span>
            <span>{formatGap(row)}</span>
            <span>{row.position === 1 || row.car.retired ? "—" : `+${interval.toFixed(1)}s`}</span>
            <span>{row.car.pitStopsMade}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
