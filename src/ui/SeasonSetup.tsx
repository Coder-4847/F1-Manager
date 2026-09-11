import { useState } from "react";
import { tracks } from "../sim/tracks";
import type { SeasonRound } from "../sim/season";

const MIN_LAPS = 3;
const MAX_LAPS = 100;

export interface SeasonSetupProps {
  initialCalendar: SeasonRound[];
  onStart: (calendar: SeasonRound[]) => void;
  onClose: () => void;
}

function trackName(trackId: string): string {
  return tracks.find((t) => t.id === trackId)?.name ?? trackId;
}

function clampLaps(laps: number): number {
  if (Number.isNaN(laps)) return MIN_LAPS;
  return Math.min(MAX_LAPS, Math.max(MIN_LAPS, Math.round(laps)));
}

export function SeasonSetup({ initialCalendar, onStart, onClose }: SeasonSetupProps) {
  const [calendar, setCalendar] = useState<SeasonRound[]>(initialCalendar);

  const addTrack = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId)!;
    setCalendar((prev) => [...prev, { trackId, laps: track.totalLaps }]);
  };

  const removeRound = (index: number) => {
    setCalendar((prev) => prev.filter((_, i) => i !== index));
  };

  const moveRound = (index: number, direction: -1 | 1) => {
    setCalendar((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const setLaps = (index: number, laps: number) => {
    setCalendar((prev) => prev.map((round, i) => (i === index ? { ...round, laps } : round)));
  };

  const fillAllDefault = () => {
    setCalendar(tracks.map((t) => ({ trackId: t.id, laps: t.totalLaps })));
  };

  const canStart = calendar.length > 0 && calendar.every((r) => r.laps >= MIN_LAPS && r.laps <= MAX_LAPS);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide season-setup" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Custom Season</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="season-setup__columns">
          <div className="season-setup__col">
            <h3>Tracks</h3>
            <div className="season-setup__track-list">
              {tracks.map((t) => (
                <button key={t.id} className="season-setup__track-btn" onClick={() => addTrack(t.id)} type="button">
                  <span>{t.name}</span>
                  <span className="season-setup__track-laps">+ Add</span>
                </button>
              ))}
            </div>
            <button className="season-setup__fill-all" onClick={fillAllDefault} type="button">
              Fill All 12 (Default Order)
            </button>
          </div>

          <div className="season-setup__col">
            <h3>Your Calendar ({calendar.length} {calendar.length === 1 ? "round" : "rounds"})</h3>
            {calendar.length === 0 && (
              <p className="season-setup__empty">Add tracks from the left to build your season.</p>
            )}
            <div className="season-setup__rounds">
              {calendar.map((round, i) => (
                <div className="season-setup__round" key={`${round.trackId}-${i}`}>
                  <span className="season-setup__round-num">{i + 1}</span>
                  <span className="season-setup__round-name">{trackName(round.trackId)}</span>
                  <input
                    className="season-setup__laps-input"
                    type="number"
                    min={MIN_LAPS}
                    max={MAX_LAPS}
                    value={round.laps}
                    onChange={(e) => setLaps(i, clampLaps(Number(e.target.value)))}
                  />
                  <span className="season-setup__laps-label">laps</span>
                  <button
                    className="season-setup__round-btn"
                    onClick={() => moveRound(i, -1)}
                    disabled={i === 0}
                    type="button"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="season-setup__round-btn"
                    onClick={() => moveRound(i, 1)}
                    disabled={i === calendar.length - 1}
                    type="button"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="season-setup__round-btn season-setup__round-remove"
                    onClick={() => removeRound(i)}
                    type="button"
                    aria-label="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            {calendar.length > 0 && (
              <button className="season-setup__clear" onClick={() => setCalendar([])} type="button">
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="driver-profile__actions">
          <span />
          <div className="driver-profile__actions-right">
            <button onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="driver-profile__save"
              disabled={!canStart}
              onClick={() => onStart(calendar)}
              type="button"
            >
              Start Season
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
