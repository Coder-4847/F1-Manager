import type { PlaybackSpeed } from "../state/useRace";

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4];

export interface PlaybackControlsProps {
  currentLap: number;
  totalLaps: number;
  playing: boolean;
  finished: boolean;
  speed: PlaybackSpeed;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSetSpeed: (speed: PlaybackSpeed) => void;
}

export function PlaybackControls({
  currentLap,
  totalLaps,
  playing,
  finished,
  speed,
  onPlay,
  onPause,
  onStep,
  onReset,
  onSetSpeed,
}: PlaybackControlsProps) {
  return (
    <div className="playback-controls">
      <div className="playback-controls__lap">
        Lap {Math.min(currentLap, totalLaps)} / {totalLaps}
      </div>
      <div className="playback-controls__buttons">
        {!finished && (playing ? (
          <button onClick={onPause}>Pause</button>
        ) : (
          <button onClick={onPlay}>Play</button>
        ))}
        <button onClick={onStep} disabled={playing || finished}>
          Step
        </button>
        <button onClick={onReset}>Reset</button>
        <div className="segmented">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={s === speed ? "segmented__btn segmented__btn--active" : "segmented__btn"}
              onClick={() => onSetSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      {finished && <div className="playback-controls__finished">Race finished</div>}
    </div>
  );
}
