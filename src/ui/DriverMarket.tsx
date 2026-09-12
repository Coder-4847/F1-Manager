import type { Driver } from "../sim/types";

export interface DriverMarketCandidate {
  driver: Driver;
  teamName: string;
}

export interface DriverMarketProps {
  teammateName: string;
  candidates: DriverMarketCandidate[];
  /** Whether the Driver Market Persists setting is on — changes the hint text about what
   *  happens to this swap when a new season starts. */
  persists: boolean;
  onSwap: (candidateDriverId: string) => void;
  onClose: () => void;
}

export function DriverMarket({ teammateName, candidates, persists, onSwap, onClose }: DriverMarketProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide driver-market" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Driver Market</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close" type="button">
            &times;
          </button>
        </div>
        <p className="team-development__subtitle">
          Swap {teammateName} for another driver on the grid — that driver's old team gets {teammateName} in
          return.{" "}
          {persists
            ? "This swap will carry into future seasons until you change it again."
            : "This swap resets back to normal if you start a new season."}
        </p>

        <div className="driver-market__list">
          {candidates.map(({ driver, teamName }) => (
            <div className="driver-market__row" key={driver.id}>
              <div className="driver-market__info">
                <span className="driver-market__name">{driver.name}</span>
                <span className="driver-market__team">{teamName}</span>
                <span className="driver-market__stats">
                  Pace {driver.stats.pace} · Tire {driver.stats.tireManagement} · Consistency{" "}
                  {driver.stats.consistency} · Aggression {driver.stats.aggression}
                </span>
              </div>
              <button type="button" onClick={() => onSwap(driver.id)}>
                Swap In
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
