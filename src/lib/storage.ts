import type { MatchRecord } from "@/types/match";

const STORAGE_KEY = "shadowverse-matchup-records-v2";
const LEGACY_STORAGE_KEY = "shadowverse-matchup-records-v1";

type LegacyMatchRecord = Omit<MatchRecord, "format"> & { displayDate?: string };

const migrateLegacyRecords = (records: LegacyMatchRecord[]): MatchRecord[] =>
  records.map(({ displayDate, ...record }) => ({
    ...record,
    date: displayDate ? `${record.date} ${displayDate}`.trim() : record.date,
    format: "",
  }));

export function loadMatches(): MatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) return (JSON.parse(current) as MatchRecord[]).map((record) => ({ ...record, format: record.format ?? "" }));

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return [];
    const migrated = migrateLegacyRecords(JSON.parse(legacy) as LegacyMatchRecord[]);
    if (migrated.length > 0) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}

export function saveMatches(records: MatchRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearMatches() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function findDuplicates(existing: MatchRecord[], incoming: MatchRecord[]) {
  const keys = new Set(existing.map((record) => [record.date, record.format, record.myDeck, record.opponentDeck, record.turn, record.result].join("\u0000")));
  return incoming.filter((record) => keys.has([record.date, record.format, record.myDeck, record.opponentDeck, record.turn, record.result].join("\u0000"))).length;
}
