import { useState } from "react";
import type { DriverProfileEdit } from "../sim/roster";

const NATIONALITIES = [
  "Argentina", "Australia", "Austria", "Belgium", "Brazil", "Canada", "Denmark",
  "Finland", "France", "Germany", "India", "Indonesia", "Ireland", "Italy",
  "Japan", "Malaysia", "Mexico", "Monaco", "Netherlands", "New Zealand",
  "Nigeria", "Norway", "Poland", "Portugal", "South Africa", "South Korea",
  "Spain", "Sweden", "Switzerland", "Thailand", "United Kingdom", "United States",
].sort();

const MIN_AGE = 16;
const MAX_AGE = 60;
const MIN_NUMBER = 1;
const MAX_NUMBER = 99;

export interface DriverProfileProps {
  teamName: string;
  profile: DriverProfileEdit;
  onSave: (edit: DriverProfileEdit) => void;
  onResetToDefault: () => DriverProfileEdit;
  onClose: () => void;
}

export function DriverProfile({ teamName, profile, onSave, onResetToDefault, onClose }: DriverProfileProps) {
  const [draft, setDraft] = useState<DriverProfileEdit>(profile);

  const nameValid = draft.name.trim().length > 0 && draft.name.trim().length <= 40;
  const ageValid = draft.age >= MIN_AGE && draft.age <= MAX_AGE;
  const numberValid = draft.number >= MIN_NUMBER && draft.number <= MAX_NUMBER;
  const canSave = nameValid && ageValid && numberValid;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal driver-profile" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Driver Profile</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <p className="driver-profile__team">{teamName}</p>

        <div className="driver-profile__field">
          <label htmlFor="dp-name">Name</label>
          <input
            id="dp-name"
            type="text"
            value={draft.name}
            maxLength={40}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          {!nameValid && <span className="driver-profile__error">Enter a name (up to 40 characters).</span>}
        </div>

        <div className="driver-profile__field-row">
          <div className="driver-profile__field">
            <label htmlFor="dp-age">Age</label>
            <input
              id="dp-age"
              type="number"
              min={MIN_AGE}
              max={MAX_AGE}
              value={draft.age}
              onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })}
            />
            {!ageValid && (
              <span className="driver-profile__error">
                {MIN_AGE}-{MAX_AGE}
              </span>
            )}
          </div>

          <div className="driver-profile__field">
            <label htmlFor="dp-number">Car number</label>
            <input
              id="dp-number"
              type="number"
              min={MIN_NUMBER}
              max={MAX_NUMBER}
              value={draft.number}
              onChange={(e) => setDraft({ ...draft, number: Number(e.target.value) })}
            />
            {!numberValid && (
              <span className="driver-profile__error">
                {MIN_NUMBER}-{MAX_NUMBER}
              </span>
            )}
          </div>
        </div>

        <div className="driver-profile__field">
          <label htmlFor="dp-nationality">Nationality</label>
          <select
            id="dp-nationality"
            value={draft.nationality}
            onChange={(e) => setDraft({ ...draft, nationality: e.target.value })}
          >
            {draft.nationality && !NATIONALITIES.includes(draft.nationality) && (
              <option value={draft.nationality}>{draft.nationality}</option>
            )}
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="driver-profile__actions">
          <button
            className="driver-profile__reset"
            onClick={() => setDraft(onResetToDefault())}
            type="button"
          >
            Reset to Default
          </button>
          <div className="driver-profile__actions-right">
            <button onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="driver-profile__save"
              disabled={!canSave}
              onClick={() => onSave(draft)}
              type="button"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
