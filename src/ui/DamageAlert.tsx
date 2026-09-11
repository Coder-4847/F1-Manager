import type { CarState } from "../sim/types";

const SEVERITY_LABEL: Record<string, string> = {
  minor: "Minor Damage",
  major: "Major Damage",
  mechanical: "Mechanical Failure",
};

export interface DamageAlertProps {
  car: CarState;
  onPit: () => void;
  onPush: () => void;
}

export function DamageAlert({ car, onPit, onPush }: DamageAlertProps) {
  const severity = car.damageSeverity ?? "minor";
  return (
    <div className="modal-backdrop">
      <div className="modal damage-alert">
        <div className={`damage-alert__badge damage-alert__badge--${severity}`}>
          {SEVERITY_LABEL[severity]}
        </div>
        <h2>{car.damageLabel}</h2>
        {car.damageDescription && <p className="damage-alert__flavor">{car.damageDescription}</p>}
        <p className="damage-alert__desc">
          {car.driver.name}'s car is losing <strong>{car.damagePenaltySeconds.toFixed(1)}s</strong> per lap until
          it's repaired. Pitting now will fix it, at the cost of roughly{" "}
          <strong>{(car.pendingRepairSeconds ?? 0).toFixed(1)}s</strong> extra time in the pit lane on top of the
          normal stop.
        </p>
        <div className="damage-alert__actions">
          <button onClick={onPush} type="button">
            Push Through
          </button>
          <button className="damage-alert__pit" onClick={onPit} type="button">
            Pit for Repairs
          </button>
        </div>
      </div>
    </div>
  );
}
