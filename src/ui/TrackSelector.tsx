import { tracks } from "../sim/tracks";

export interface TrackSelectorProps {
  selectedTrackId: string;
  onSelect: (trackId: string) => void;
  disabled?: boolean;
}

export function TrackSelector({ selectedTrackId, onSelect, disabled }: TrackSelectorProps) {
  return (
    <select
      className="track-selector"
      value={selectedTrackId}
      disabled={disabled}
      onChange={(e) => onSelect(e.target.value)}
    >
      {tracks.map((track) => (
        <option key={track.id} value={track.id}>
          {track.name} ({track.totalLaps} laps)
        </option>
      ))}
    </select>
  );
}
