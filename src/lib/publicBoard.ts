import type { MatchRecord } from "@/types/match";
import { supabase } from "@/lib/supabase";

type PublicMatchRow = { id: string; date: string; format: string; my_deck: string; opponent_deck: string; turn: string; result: MatchRecord["result"]; memo: string };

const toRecord = (row: PublicMatchRow): MatchRecord => ({ id: row.id, date: row.date, format: row.format ?? "", myDeck: row.my_deck, opponentDeck: row.opponent_deck, turn: row.turn, result: row.result, memo: row.memo });

const PAGE_SIZE = 1000;
const CHUNK_SIZE = 2000;

export async function loadPublicBoard(): Promise<MatchRecord[]> {
  if (!supabase) return [];

  const allRows: PublicMatchRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    // RPCでrange指定取得を試行
    const { data, error } = await supabase.rpc("get_public_board_matches").range(from, to);

    if (error) {
      // RPCがrangeに非対応またはエラーの場合、テーブルから直接全件ページネーション取得
      const fallback = await supabase
        .from("public_board_matches")
        .select("id, date, format, my_deck, opponent_deck, turn, result, memo")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fallback.error) throw error;
      const rows = (fallback.data ?? []) as unknown as PublicMatchRow[];
      allRows.push(...rows);
      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
      continue;
    }

    const rows = (data ?? []) as PublicMatchRow[];
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows.map(toRecord);
}

export async function appendPublicBoard(records: MatchRecord[]) {
  if (!supabase) throw new Error("Supabaseが設定されていません。");
  if (records.length === 0) return;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.rpc("append_public_board_matches", { public_records: chunk });
    if (error) throw error;
  }
}
