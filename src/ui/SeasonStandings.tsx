import type { ConstructorStandingRow, DriverStandingRow } from "../sim/season";

export interface SeasonStandingsProps {
  driverStandings: DriverStandingRow[];
  constructorStandings: ConstructorStandingRow[];
  playerDriverId: string;
}

function podiumClass(position: number): string {
  if (position === 1) return " standings-table__row--p1";
  if (position === 2) return " standings-table__row--p2";
  if (position === 3) return " standings-table__row--p3";
  return "";
}

export function SeasonStandings({ driverStandings, constructorStandings, playerDriverId }: SeasonStandingsProps) {
  return (
    <div className="season-standings">
      <div>
        <h3>Drivers</h3>
        <table className="standings-table">
          <tbody>
            {driverStandings.map((row) => (
              <tr
                key={row.driverId}
                className={
                  (row.driverId === playerDriverId ? "player-row" : "") + podiumClass(row.position)
                }
              >
                <td className="standings-table__pos">{row.position}</td>
                <td>{row.driverName}</td>
                <td className="standings-table__points">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3>Constructors</h3>
        <table className="standings-table">
          <tbody>
            {constructorStandings.map((row) => (
              <tr key={row.teamId} className={podiumClass(row.position)}>
                <td className="standings-table__pos">{row.position}</td>
                <td>{row.teamName}</td>
                <td className="standings-table__points">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
