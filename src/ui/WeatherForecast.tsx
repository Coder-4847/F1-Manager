import type { WeatherCondition } from "../sim/types";

const WEATHER_COLOR: Record<WeatherCondition, string> = {
  dry: "var(--text)",
  damp: "var(--yellow)",
  wet: "#4aa3ff",
};
const WEATHER_ICON: Record<WeatherCondition, string> = { dry: "☀", damp: "🌥", wet: "🌧" };
const WEATHER_LABEL: Record<WeatherCondition, string> = { dry: "Dry", damp: "Damp", wet: "Wet" };

interface Segment {
  weather: WeatherCondition;
  fromLap: number;
  toLap: number;
  laps: number;
}

function toSegments(forecast: WeatherCondition[], startLap: number): Segment[] {
  const segments: Segment[] = [];
  forecast.forEach((w, i) => {
    const lap = startLap + i;
    const last = segments[segments.length - 1];
    if (last && last.weather === w) {
      last.toLap = lap;
      last.laps += 1;
    } else {
      segments.push({ weather: w, fromLap: lap, toLap: lap, laps: 1 });
    }
  });
  return segments;
}

export interface WeatherForecastProps {
  /** Weather per lap, forecast[0] corresponding to `startLap`. Not a guarantee — see generateWeatherForecast. */
  forecast: WeatherCondition[];
  /** The lap number forecast[0] represents. */
  startLap: number;
}

/** A compact colored strip + legend showing a lap-by-lap weather forecast, for planning pit stops around. */
export function WeatherForecast({ forecast, startLap }: WeatherForecastProps) {
  if (forecast.length === 0) return null;
  const segments = toSegments(forecast, startLap);
  const totalLaps = forecast.length;

  return (
    <div className="weather-forecast">
      <div className="weather-forecast__bar">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="weather-forecast__segment"
            style={{ width: `${(seg.laps / totalLaps) * 100}%`, background: WEATHER_COLOR[seg.weather] }}
            title={`${WEATHER_LABEL[seg.weather]} · Lap ${seg.fromLap}${seg.toLap > seg.fromLap ? `-${seg.toLap}` : ""}`}
          />
        ))}
      </div>
      <div className="weather-forecast__legend">
        {segments.map((seg, i) => (
          <span key={i} className="weather-forecast__legend-item">
            {WEATHER_ICON[seg.weather]} L{seg.fromLap}
            {seg.toLap > seg.fromLap ? `-${seg.toLap}` : ""} {WEATHER_LABEL[seg.weather]}
          </span>
        ))}
      </div>
    </div>
  );
}
