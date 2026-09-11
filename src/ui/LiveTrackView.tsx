import { useEffect, useMemo, useRef } from "react";
import type { StandingsRow } from "../sim/raceEngine";
import type { LapEvent, Track } from "../sim/types";
import { getTrackPath } from "../sim/trackPaths";
import { teams } from "../sim/roster";

export interface LiveTrackViewProps {
  track: Track;
  standings: StandingsRow[];
  currentLap: number;
  playing: boolean;
  tickDurationMs: number;
  events: LapEvent[];
}

function teamColor(teamId: string): string {
  const index = teams.findIndex((t) => t.id === teamId);
  const hue = (index >= 0 ? index : 0) * 45;
  return `hsl(${hue}, 75%, 58%)`;
}

export function LiveTrackView({ track, standings, currentLap, playing, tickDurationMs, events }: LiveTrackViewProps) {
  const trackPath = useMemo(() => getTrackPath(track.id), [track.id]);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRefs = useRef<Map<string, SVGCircleElement>>(new Map());
  const labelRefs = useRef<Map<string, SVGTextElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const lapStartRef = useRef<number>(performance.now());

  // Restart the animation clock whenever a new lap begins.
  useEffect(() => {
    lapStartRef.current = performance.now();
  }, [currentLap]);

  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;
    const totalLength = pathEl.getTotalLength();
    const avgLapTime = track.baseLapTimeSeconds;
    let cancelled = false;

    const frame = () => {
      if (cancelled) return;
      const elapsed = performance.now() - lapStartRef.current;
      const clockFraction = playing ? Math.min(1, elapsed / tickDurationMs) : 1;

      for (const row of standings) {
        const dot = dotRefs.current.get(row.car.driver.id);
        const label = labelRefs.current.get(row.car.driver.id);
        if (!dot) continue;
        const gapFraction = row.gapToLeaderSeconds / avgLapTime;
        const fraction = (((clockFraction - gapFraction) % 1) + 1) % 1;
        const point = pathEl.getPointAtLength(fraction * totalLength);
        dot.setAttribute("cx", point.x.toFixed(1));
        dot.setAttribute("cy", point.y.toFixed(1));
        if (label) {
          label.setAttribute("x", (point.x + 8).toFixed(1));
          label.setAttribute("y", (point.y - 8).toFixed(1));
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [standings, track.baseLapTimeSeconds, playing, tickDurationMs]);

  const justPittedIds = new Set(
    events.filter((e) => e.type === "pit-stop" && e.lap === currentLap).map((e) => e.driverId)
  );

  return (
    <div className="live-track">
      <svg viewBox={trackPath.viewBox} className="live-track__svg">
        <path ref={pathRef} d={trackPath.d} className="live-track__outline" />
        {standings.map((row) => (
          <g key={row.car.driver.id}>
            <circle
              ref={(el) => {
                if (el) dotRefs.current.set(row.car.driver.id, el);
                else dotRefs.current.delete(row.car.driver.id);
              }}
              r={row.car.isPlayer ? 7 : 5}
              fill={teamColor(row.car.team.id)}
              className={
                "live-track__car" +
                (row.car.isPlayer ? " live-track__car--player" : "") +
                (justPittedIds.has(row.car.driver.id) ? " live-track__car--pit" : "")
              }
            />
            <text
              ref={(el) => {
                if (el) labelRefs.current.set(row.car.driver.id, el);
                else labelRefs.current.delete(row.car.driver.id);
              }}
              className="live-track__label"
            >
              {row.position}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
