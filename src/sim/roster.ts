import type { Driver, Team } from "./types";

// Fictional teams and drivers only — no real-world likenesses.

export const teams: Team[] = [
  { id: "aurora", name: "Aurora Racing", carPerformance: 92 },
  { id: "vantage", name: "Vantage Motorsport", carPerformance: 89 },
  { id: "kestrel", name: "Kestrel GP", carPerformance: 85 },
  { id: "obsidian", name: "Obsidian F1 Team", carPerformance: 82 },
  { id: "solstice", name: "Solstice Racing", carPerformance: 78 },
  { id: "ironclad", name: "Ironclad Motorsport", carPerformance: 75 },
  { id: "meridian", name: "Meridian Racing", carPerformance: 71 },
  { id: "vulcan", name: "Vulcan GP", carPerformance: 68 },
];

export const drivers: Driver[] = [
  // Aurora
  { id: "a-1", name: "Mika Renard", teamId: "aurora", stats: { pace: 93, tireManagement: 80, consistency: 88, aggression: 65 } },
  { id: "a-2", name: "Théo Bastian", teamId: "aurora", stats: { pace: 89, tireManagement: 85, consistency: 82, aggression: 58 } },
  // Vantage
  { id: "v-1", name: "Oskar Lindqvist", teamId: "vantage", stats: { pace: 90, tireManagement: 75, consistency: 84, aggression: 78 } },
  { id: "v-2", name: "Diego Marín", teamId: "vantage", stats: { pace: 87, tireManagement: 82, consistency: 86, aggression: 60 } },
  // Kestrel
  { id: "k-1", name: "Ravi Chandran", teamId: "kestrel", stats: { pace: 85, tireManagement: 88, consistency: 90, aggression: 50 } },
  { id: "k-2", name: "Felix Amaro", teamId: "kestrel", stats: { pace: 83, tireManagement: 78, consistency: 79, aggression: 70 } },
  // Obsidian
  { id: "o-1", name: "Niklas Voss", teamId: "obsidian", stats: { pace: 82, tireManagement: 80, consistency: 81, aggression: 66 } },
  { id: "o-2", name: "Samuel Okafor", teamId: "obsidian", stats: { pace: 80, tireManagement: 83, consistency: 85, aggression: 55 } },
  // Solstice
  { id: "s-1", name: "Enzo Ferretti", teamId: "solstice", stats: { pace: 79, tireManagement: 70, consistency: 74, aggression: 82 } },
  { id: "s-2", name: "Luca Moretti", teamId: "solstice", stats: { pace: 76, tireManagement: 76, consistency: 78, aggression: 62 } },
  // Ironclad
  { id: "i-1", name: "Connor Blake", teamId: "ironclad", stats: { pace: 75, tireManagement: 74, consistency: 77, aggression: 68 } },
  { id: "i-2", name: "Jamie Sutherland", teamId: "ironclad", stats: { pace: 73, tireManagement: 79, consistency: 80, aggression: 52 } },
  // Meridian
  { id: "m-1", name: "Pieter van Dijk", teamId: "meridian", stats: { pace: 71, tireManagement: 72, consistency: 75, aggression: 60 } },
  { id: "m-2", name: "Aksel Berg", teamId: "meridian", stats: { pace: 69, tireManagement: 77, consistency: 73, aggression: 64 } },
  // Vulcan
  { id: "vu-1", name: "Marco Silveira", teamId: "vulcan", stats: { pace: 68, tireManagement: 70, consistency: 70, aggression: 72 } },
  { id: "vu-2", name: "Tomás Herrera", teamId: "vulcan", stats: { pace: 65, tireManagement: 73, consistency: 72, aggression: 58 } },
];

export function getTeam(teamId: string): Team {
  const team = teams.find((t) => t.id === teamId);
  if (!team) throw new Error(`Unknown team id: ${teamId}`);
  return team;
}
