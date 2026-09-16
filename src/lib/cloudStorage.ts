import type { MatchRecord } from "@/types/match";
import { supabase } from "@/lib/supabase";

type MatchRow = { id: string; workspace_id: string; date: string; format: string; my_deck: string; opponent_deck: string; turn: string; result: MatchRecord["result"]; memo: string };

const PAGE_SIZE = 1000;
const CHUNK_SIZE = 1000;

export async function loadCloudMatches(workspaceId: string): Promise<MatchRecord[]> {
  if (!supabase) return [];

  const allRows: MatchRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("date", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const rows = (data ?? []) as MatchRow[];
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows.map((row) => ({
    id: row.id,
    date: row.date,
    format: row.format ?? "",
    myDeck: row.my_deck,
    opponentDeck: row.opponent_deck,
    turn: row.turn,
    result: row.result,
    memo: row.memo,
  }));
}

export async function insertCloudMatches(workspaceId: string, records: MatchRecord[]) {
  if (!supabase || records.length === 0) return;
  const rows = records.map(({ id, date, format, myDeck, opponentDeck, turn, result, memo }) => ({ id, date, format, my_deck: myDeck, opponent_deck: opponentDeck, turn, result, memo, workspace_id: workspaceId }));

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("matches").upsert(chunk, { onConflict: "id" });
    if (error) throw error;
  }
}

export async function clearCloudMatches(workspaceId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("matches").delete().eq("workspace_id", workspaceId);
  if (error) throw error;
}
