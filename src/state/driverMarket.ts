const DRIVER_MARKET_KEY = "f1-manager-driver-market-v1";

/** Always persisted (unlike the Driver Market Persists *setting*, which only controls
 *  whether App.tsx reapplies this across a season restart) — a plain page reload within
 *  the same season should never silently undo a trade, same as driverProfile.ts. */
export function saveDriverMarketSwap(teamIdByDriverId: Record<string, string>): void {
  try {
    localStorage.setItem(DRIVER_MARKET_KEY, JSON.stringify(teamIdByDriverId));
  } catch {
    // Storage can be unavailable (private browsing, quota) — saving is best-effort.
  }
}

export function clearDriverMarketSwap(): void {
  try {
    localStorage.removeItem(DRIVER_MARKET_KEY);
  } catch {
    // Storage can be unavailable — clearing is best-effort.
  }
}

export function loadDriverMarketSwap(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(DRIVER_MARKET_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}
