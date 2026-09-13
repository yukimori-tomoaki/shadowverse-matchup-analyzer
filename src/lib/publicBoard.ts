import type { MatchRecord } from "@/types/match";
import { supabase } from "@/lib/supabase";

type PublicMatchRow = { id: string; date: string; format: string; my_deck: string; opponent_deck: string; turn: string; result: MatchRecord["result"]; memo: string };

const toRecord = (row: PublicMatchRow): MatchRecord => ({ id: row.id, date: row.date, format: row.format ?? "", myDeck: row.my_deck, opponentDeck: row.opponent_deck, turn: row.turn, result: row.result, memo: row.memo });

export async function loadPublicBoard(): Promise<MatchRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_public_board_matches");
  if (error) throw error;
  return (data as PublicMatchRow[]).map(toRecord);
}

export async function appendPublicBoard(records: MatchRecord[]) {
  if (!supabase) throw new Error("Supabaseが設定されていません。");
  const { error } = await supabase.rpc("append_public_board_matches", { public_records: records });
  if (error) throw error;
}
