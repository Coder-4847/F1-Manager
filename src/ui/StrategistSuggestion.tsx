import type { StrategistSuggestion } from "../sim/strategist";

export interface StrategistSuggestionCardProps {
  suggestion: StrategistSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

export function StrategistSuggestionCard({ suggestion, onAccept, onDismiss }: StrategistSuggestionCardProps) {
  return (
    <div className="strategist-suggestion">
      <div className="strategist-suggestion__label">📻 Race Engineer</div>
      <p className="strategist-suggestion__message">{suggestion.message}</p>
      <div className="strategist-suggestion__actions">
        <button type="button" onClick={onDismiss}>
          Ignore
        </button>
        <button type="button" className="strategist-suggestion__accept" onClick={onAccept}>
          {suggestion.actionLabel}
        </button>
      </div>
    </div>
  );
}
