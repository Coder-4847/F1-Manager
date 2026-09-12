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

// A wheel color fixed regardless of team/theme (the site is always-dark — see App.css) —
// real tires read as dark regardless of livery, and it keeps the car shape legible against
// any team color.
const WHEEL_COLOR = "#1c1c1c";

/** A small top-down F1 car silhouette — centered on its own origin with the nose pointing
 *  along +X, so a plain translate+rotate(angleDeg)+scale places and orients it with no
 *  further adjustment. Sized in local units comparable to the old marker dot's diameter
 *  (10-14 units) so it drops into the same visual weight on the track. */
function CarShape({ color }: { color: string }) {
  return (
    <>
      <rect x="-6" y="-1.6" width="1.1" height="3.2" fill={color} />
      <path d="M-5,-1.1 L2.8,-1.9 L6,0 L2.8,1.9 L-5,1.1 Z" fill={color} />
      <rect x="5" y="-0.8" width="1.4" height="1.6" fill={color} />
      <circle cx="-1.1" cy="0" r="1.2" fill={WHEEL_COLOR} />
      <rect x="-3.3" y="-3.3" width="1.7" height="1.3" rx="0.4" fill={WHEEL_COLOR} />
      <rect x="-3.3" y="2.0" width="1.7" height="1.3" rx="0.4" fill={WHEEL_COLOR} />
      <rect x="1.6" y="-3.3" width="1.7" height="1.3" rx="0.4" fill={WHEEL_COLOR} />
      <rect x="1.6" y="2.0" width="1.7" height="1.3" rx="0.4" fill={WHEEL_COLOR} />
    </>
  );
}

/** How far ahead (in path-length units) to sample for the tangent direction — a fixed
 *  distance rather than a fraction of lap length, so heading looks equally responsive on
 *  a short track and a long one. */
const HEADING_LOOKAHEAD = 2;

export function LiveTrackView({ track, standings, currentLap, playing, tickDurationMs, events }: LiveTrackViewProps) {
  const trackPath = useMemo(() => getTrackPath(track.id), [track.id]);
  const pathRef = useRef<SVGPathElement>(null);
  const carRefs = useRef<Map<string, SVGGElement>>(new Map());
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
        const car = carRefs.current.get(row.car.driver.id);
        const label = labelRefs.current.get(row.car.driver.id);
        if (!car) continue;
        const gapFraction = row.gapToLeaderSeconds / avgLapTime;
        const fraction = (((clockFraction - gapFraction) % 1) + 1) % 1;
        const length = fraction * totalLength;
        const point = pathEl.getPointAtLength(length);
        const ahead = pathEl.getPointAtLength((length + HEADING_LOOKAHEAD) % totalLength);
        const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180 / Math.PI);
        const scale = row.car.isPlayer ? 1.4 : 1;
        car.setAttribute(
          "transform",
          `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${scale})`
        );
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
            <g
              ref={(el) => {
                if (el) carRefs.current.set(row.car.driver.id, el);
                else carRefs.current.delete(row.car.driver.id);
              }}
              className={
                "live-track__car" +
                (row.car.isPlayer ? " live-track__car--player" : "") +
                (justPittedIds.has(row.car.driver.id) ? " live-track__car--pit" : "")
              }
            >
              <CarShape color={teamColor(row.car.team.id)} />
            </g>
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
