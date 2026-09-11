import type { StandingsRow } from "../sim/raceEngine";

// A simple linear gap chart, not a real circuit map — that's a Phase 5 animation
// upgrade. Leader sits at the left edge; every other car is placed by its gap to
// the leader, compressed into the available width.
export function TrackPositionStrip({ standings }: { standings: StandingsRow[] }) {
  const maxGap = Math.max(1, ...standings.map((r) => r.gapToLeaderSeconds));

  return (
    <div className="track-strip">
      <div className="track-strip__track">
        {standings.map((row) => {
          const pct = Math.min(100, (row.gapToLeaderSeconds / maxGap) * 100);
          return (
            <div
              key={row.car.driver.id}
              className={`track-strip__dot${row.car.isPlayer ? " track-strip__dot--player" : ""}`}
              style={{ left: `${pct}%` }}
              title={`${row.position}. ${row.car.driver.name} (+${row.gapToLeaderSeconds.toFixed(1)}s)`}
            >
              <span className="track-strip__pos">{row.position}</span>
            </div>
          );
        })}
      </div>
      <div className="track-strip__labels">
        <span>Leader</span>
        <span>+{maxGap.toFixed(0)}s</span>
      </div>
    </div>
  );
}
