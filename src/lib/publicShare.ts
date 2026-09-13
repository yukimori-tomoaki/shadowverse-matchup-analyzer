import type { MatchRecord } from "@/types/match";
import { supabase } from "@/lib/supabase";

type PublicMatchRow = { id: string; date: string; display_date: string; my_deck: string; opponent_deck: string; turn: string; result: MatchRecord["result"]; memo: string };

const toMatchRecord = (row: PublicMatchRow): MatchRecord => ({ id: row.id, date: row.date, displayDate: row.display_date, myDeck: row.my_deck, opponentDeck: row.opponent_deck, turn: row.turn, result: row.result, memo: row.memo });

export async function loadPublicMatches(token: string): Promise<MatchRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_public_matches", { public_token: token });
  if (error) throw error;
  return (data as PublicMatchRow[]).map(toMatchRecord);
}

export async function loadGuestMatches(token: string): Promise<MatchRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_guest_publication", { public_token: token });
  if (error) throw error;
  return (data as PublicMatchRow[]).map(toMatchRecord);
}
