import { useState } from "react";
import type { TeamOrder } from "../sim/types";

export interface TeamRadioRival {
  id: string;
  name: string;
}

export interface TeamRadioProps {
  teammateName: string;
  currentOrder: TeamOrder | null;
  /** Cars currently near the teammate on track — candidates to name in a "block" order. */
  rivals: TeamRadioRival[];
  onSetOrder: (order: TeamOrder | null) => void;
  onClose: () => void;
}

export function TeamRadio({ teammateName, currentOrder, rivals, onSetOrder, onClose }: TeamRadioProps) {
  const [selectedRival, setSelectedRival] = useState(rivals[0]?.id ?? "");
  const teammateFirstName = teammateName.split(" ")[0];
  const blockTargetName = currentOrder?.type === "block" ? rivals.find((r) => r.id === currentOrder.targetDriverId)?.name : undefined;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal team-radio" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Team Radio</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close" type="button">
            &times;
          </button>
        </div>
        <p className="team-radio__subtitle">Orders to {teammateName}</p>

        <div className="team-radio__status">
          {currentOrder === null && "No standing order — racing freely."}
          {currentOrder?.type === "hold" && "Holding position with you."}
          {currentOrder?.type === "let-through" && "Will let you through next time you're right behind them."}
          {currentOrder?.type === "block" && `Defending against ${blockTargetName ?? "the selected rival"} on your behalf.`}
        </div>

        <div className="team-radio__card">
          <h3>Hold Position</h3>
          <p className="team-radio__desc">Neither of you fights the other for the rest of the race.</p>
          <button type="button" disabled={currentOrder?.type === "hold"} onClick={() => onSetOrder({ type: "hold" })}>
            Give Order
          </button>
        </div>

        <div className="team-radio__card">
          <h3>Let Me Through</h3>
          <p className="team-radio__desc">
            {teammateFirstName} concedes the position outright the next time you're running right behind them.
          </p>
          <button
            type="button"
            disabled={currentOrder?.type === "let-through"}
            onClick={() => onSetOrder({ type: "let-through" })}
          >
            Give Order
          </button>
        </div>

        {rivals.length > 0 && (
          <div className="team-radio__card">
            <h3>Push to Block</h3>
            <p className="team-radio__desc">
              {teammateFirstName} defends hard against the chosen rival, at some cost to their own race.
            </p>
            <div className="team-radio__block-row">
              <select value={selectedRival} onChange={(e) => setSelectedRival(e.target.value)}>
                {rivals.map((rival) => (
                  <option key={rival.id} value={rival.id}>
                    {rival.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={currentOrder?.type === "block" && currentOrder.targetDriverId === selectedRival}
                onClick={() => onSetOrder({ type: "block", targetDriverId: selectedRival })}
              >
                Give Order
              </button>
            </div>
          </div>
        )}

        {currentOrder && (
          <div className="driver-profile__actions">
            <button type="button" onClick={() => onSetOrder(null)}>
              Cancel Standing Order
            </button>
            <span />
          </div>
        )}
      </div>
    </div>
  );
}
