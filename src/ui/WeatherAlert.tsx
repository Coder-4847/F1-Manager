import { useState } from "react";
import type { CarState, TireCompound, WeatherCondition } from "../sim/types";

const COMPOUNDS: TireCompound[] = ["soft", "medium", "hard", "intermediate", "wet"];
const COMPOUND_LABEL: Record<TireCompound, string> = {
  soft: "Soft",
  medium: "Medium",
  hard: "Hard",
  intermediate: "Inter",
  wet: "Wet",
};
const WEATHER_LABEL: Record<WeatherCondition, string> = { dry: "Dry", damp: "Damp", wet: "Wet" };
const RECOMMENDED_COMPOUND: Record<WeatherCondition, TireCompound> = {
  dry: "medium",
  damp: "intermediate",
  wet: "wet",
};

export interface WeatherAlertProps {
  weather: WeatherCondition;
  car: CarState;
  onPit: (compound: TireCompound) => void;
  onPush: () => void;
}

export function WeatherAlert({ weather, car, onPit, onPush }: WeatherAlertProps) {
  const [compound, setCompound] = useState<TireCompound>(RECOMMENDED_COMPOUND[weather]);

  return (
    <div className="modal-backdrop">
      <div className="modal weather-alert">
        <div className={`weather-alert__badge weather-alert__badge--${weather}`}>
          Conditions: {WEATHER_LABEL[weather]}
        </div>
        <h2>Weather Change!</h2>
        <p className="damage-alert__desc">
          The track is now <strong>{WEATHER_LABEL[weather].toLowerCase()}</strong>. You're currently on{" "}
          <strong>{COMPOUND_LABEL[car.currentCompound].toLowerCase()}</strong> tires — pit for tires suited to
          the conditions, or push through as you are.
        </p>
        <div className="driver-profile__field">
          <label>Pit for</label>
          <div className="segmented segmented--compounds">
            {COMPOUNDS.map((c) => (
              <button
                key={c}
                type="button"
                className={c === compound ? "segmented__btn segmented__btn--active" : "segmented__btn"}
                onClick={() => setCompound(c)}
              >
                {COMPOUND_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <div className="damage-alert__actions">
          <button onClick={onPush} type="button">
            Push Through
          </button>
          <button className="damage-alert__pit" onClick={() => onPit(compound)} type="button">
            Pit Now
          </button>
        </div>
      </div>
    </div>
  );
}
