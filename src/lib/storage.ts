import type { MatchRecord } from "@/types/match";

const STORAGE_KEY = "shadowverse-matchup-records-v1";

export function loadMatches(): MatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveMatches(records: MatchRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearMatches() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function findDuplicates(existing: MatchRecord[], incoming: MatchRecord[]) {
  const keys = new Set(existing.map((record) => [record.date, record.displayDate, record.myDeck, record.opponentDeck, record.turn, record.result].join("\u0000")));
  return incoming.filter((record) => keys.has([record.date, record.displayDate, record.myDeck, record.opponentDeck, record.turn, record.result].join("\u0000"))).length;
}
