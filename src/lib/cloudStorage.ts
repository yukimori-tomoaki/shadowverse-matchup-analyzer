import type { MatchRecord } from "@/types/match";
import { supabase } from "@/lib/supabase";

type MatchRow = { id: string; workspace_id: string; date: string; display_date: string; my_deck: string; opponent_deck: string; turn: string; result: MatchRecord["result"]; memo: string };

export async function loadCloudMatches(workspaceId: string): Promise<MatchRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("matches").select("*").eq("workspace_id", workspaceId).order("date", { ascending: false });
  if (error) throw error;
  return (data as MatchRow[]).map((row) => ({
    id: row.id,
    date: row.date,
    displayDate: row.display_date,
    myDeck: row.my_deck,
    opponentDeck: row.opponent_deck,
    turn: row.turn,
    result: row.result,
    memo: row.memo,
  }));
}

export async function insertCloudMatches(workspaceId: string, records: MatchRecord[]) {
  if (!supabase) return;
  const rows = records.map(({ id, date, displayDate, myDeck, opponentDeck, turn, result, memo }) => ({ id, date, display_date: displayDate, my_deck: myDeck, opponent_deck: opponentDeck, turn, result, memo, workspace_id: workspaceId }));
  const { error } = await supabase.from("matches").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

export async function clearCloudMatches(workspaceId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("matches").delete().eq("workspace_id", workspaceId);
  if (error) throw error;
}
