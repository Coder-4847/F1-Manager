import type { FinalResultRow } from "../sim/raceEngine";

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = (s % 60).toFixed(3).padStart(6, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
  return `${minutes}:${secs}`;
}

export interface RaceResultsProps {
  trackName: string;
  results: FinalResultRow[];
  onClose: () => void;
  onManageDevelopment: () => void;
}

export function RaceResults({ trackName, results, onClose, onManageDevelopment }: RaceResultsProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide race-results" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Race Results</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <p className="racing-plan__track">{trackName} &middot; Final Classification</p>

        <div className="race-results__table" role="table">
          <div className="race-results__row race-results__row--head" role="row">
            <span>Pos</span>
            <span>Driver</span>
            <span>Team</span>
            <span>Best Lap</span>
            <span>Total Time</span>
            <span>Pens</span>
          </div>
          {results.map((row) => (
            <div
              key={row.car.driver.id}
              role="row"
              className={
                "race-results__row" +
                (row.car.isPlayer ? " player-row" : "") +
                (row.car.retired ? " race-results__row--dnf" : "")
              }
            >
              <span>{row.car.retired ? "DNF" : row.position}</span>
              <span>
                {row.car.driver.name}
                {row.car.retired && row.car.retiredReason && (
                  <span className="race-results__reason"> — {row.car.retiredReason}</span>
                )}
              </span>
              <span>{row.car.team.name}</span>
              <span>{row.bestLapSeconds !== null ? formatDuration(row.bestLapSeconds) : "—"}</span>
              <span>
                {row.car.retired
                  ? `${row.car.lapsCompleted} laps`
                  : row.position === 1
                    ? formatDuration(row.car.totalTimeSeconds)
                    : `+${row.gapToLeaderSeconds.toFixed(1)}s`}
              </span>
              <span>{row.car.penaltySeconds > 0 ? `+${row.car.penaltySeconds}s` : "—"}</span>
            </div>
          ))}
        </div>

        <div className="driver-profile__actions">
          <button type="button" onClick={onManageDevelopment}>
            Manage Development Budget
          </button>
          <div className="driver-profile__actions-right">
            <button className="driver-profile__save" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
