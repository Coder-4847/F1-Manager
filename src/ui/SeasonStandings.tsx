import type { ConstructorStandingRow, DriverStandingRow } from "../sim/season";

export interface SeasonStandingsProps {
  driverStandings: DriverStandingRow[];
  constructorStandings: ConstructorStandingRow[];
  playerDriverId: string;
}

export function SeasonStandings({ driverStandings, constructorStandings, playerDriverId }: SeasonStandingsProps) {
  return (
    <div className="season-standings">
      <div>
        <h3>Drivers</h3>
        <table className="standings-table">
          <tbody>
            {driverStandings.map((row) => (
              <tr key={row.driverId} className={row.driverId === playerDriverId ? "player-row" : ""}>
                <td>{row.position}</td>
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
              <tr key={row.teamId}>
                <td>{row.position}</td>
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
