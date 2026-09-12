import type { CautionPeriod, Track } from "../sim/types";
import { cautionPitLossMultiplier } from "../sim/caution";

const TYPE_LABEL: Record<CautionPeriod["type"], string> = {
  sc: "Safety Car",
  vsc: "Virtual Safety Car",
};

export interface CautionAlertProps {
  caution: CautionPeriod;
  track: Track;
  onPit: () => void;
  onPush: () => void;
}

export function CautionAlert({ caution, track, onPit, onPush }: CautionAlertProps) {
  const estimatedPitLoss = track.pitLaneLossSeconds * cautionPitLossMultiplier(caution.type);
  return (
    <div className="modal-backdrop">
      <div className="modal caution-alert">
        <div className={`caution-alert__badge caution-alert__badge--${caution.type}`}>{TYPE_LABEL[caution.type]}</div>
        <h2>{caution.type === "sc" ? "Safety Car Deployed!" : "Virtual Safety Car Deployed!"}</h2>
        <p className="damage-alert__desc">
          {caution.type === "sc"
            ? "The field is bunching up nose-to-tail behind the Safety Car. No overtaking, and pit stops are much cheaper for as long as it's out — a rare chance to jump the queue."
            : "Everyone's holding a slower delta lap — no overtaking, and pit stops cost noticeably less while it's out."}{" "}
          Expected to last around <strong>{caution.durationLaps} laps</strong>.
        </p>
        <p className="damage-alert__desc">
          Pitting now costs roughly <strong>{estimatedPitLoss.toFixed(1)}s</strong> of track time here, well below a
          normal stop.
        </p>
        <div className="damage-alert__actions">
          <button onClick={onPush} type="button">
            Stay Out
          </button>
          <button className="damage-alert__pit" onClick={onPit} type="button">
            Pit Now
          </button>
        </div>
      </div>
    </div>
  );
}
