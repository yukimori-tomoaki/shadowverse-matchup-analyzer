import type { MatchRecord } from "@/types/match";
import { supabase } from "@/lib/supabase";

type PublicMatchRow = { id: string; date: string; format: string; my_deck: string; opponent_deck: string; turn: string; result: MatchRecord["result"]; memo: string };

const toMatchRecord = (row: PublicMatchRow): MatchRecord => ({ id: row.id, date: row.date, format: row.format ?? "", myDeck: row.my_deck, opponentDeck: row.opponent_deck, turn: row.turn, result: row.result, memo: row.memo });

const PAGE_SIZE = 1000;

export async function loadPublicMatches(token: string): Promise<MatchRecord[]> {
  if (!supabase) return [];

  const allRows: PublicMatchRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .rpc("get_public_matches", { public_token: token })
      .range(from, to);
    if (error) throw error;

    const rows = (data ?? []) as PublicMatchRow[];
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows.map(toMatchRecord);
}

export async function loadGuestMatches(token: string): Promise<MatchRecord[]> {
  if (!supabase) return [];

  const allRows: PublicMatchRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .rpc("get_guest_publication", { public_token: token })
      .range(from, to);
    if (error) throw error;

    const rows = (data ?? []) as PublicMatchRow[];
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows.map(toMatchRecord);
}
