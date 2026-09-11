import type { StandingsRow } from "../sim/raceEngine";
import { TireBadge } from "./TireBadge";

function formatGap(seconds: number, position: number): string {
  if (position === 1) return "Leader";
  return `+${seconds.toFixed(1)}s`;
}

export function Leaderboard({ standings }: { standings: StandingsRow[] }) {
  return (
    <table className="leaderboard">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th>Tires</th>
          <th>Gap</th>
          <th>Interval</th>
          <th>Stops</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((row, i) => {
          const ahead = standings[i - 1];
          const interval = ahead ? row.car.totalTimeSeconds - ahead.car.totalTimeSeconds : 0;
          return (
            <tr key={row.car.driver.id} className={row.car.isPlayer ? "player-row" : ""}>
              <td>{row.position}</td>
              <td>{row.car.driver.name}</td>
              <td>{row.car.team.name}</td>
              <td>
                <TireBadge compound={row.car.currentCompound} tireAge={row.car.tireAge} />
              </td>
              <td>{formatGap(row.gapToLeaderSeconds, row.position)}</td>
              <td>{row.position === 1 ? "—" : `+${interval.toFixed(1)}s`}</td>
              <td>{row.car.pitStopsMade}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
