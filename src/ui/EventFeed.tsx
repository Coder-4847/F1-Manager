import type { LapEvent } from "../sim/types";

const ICON: Record<LapEvent["type"], string> = {
  "pit-stop": "🔧",
  overtake: "⏩",
  damage: "💥",
};

export function EventFeed({ events }: { events: LapEvent[] }) {
  const recent = [...events].reverse();
  return (
    <ul className="event-feed">
      {recent.length === 0 && <li className="event-feed__empty">No events yet.</li>}
      {recent.map((event, i) => (
        <li key={i} className={`event-feed__item event-feed__item--${event.type}`}>
          <span className="event-feed__icon">{ICON[event.type]}</span>
          <span className="event-feed__lap">L{event.lap}</span>
          <span>{event.message}</span>
        </li>
      ))}
    </ul>
  );
}
