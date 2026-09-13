import type { MatchRecord } from "@/types/match";
import { supabase } from "@/lib/supabase";

function createToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function publishGuestMatches(records: MatchRecord[]) {
  if (!supabase) throw new Error("Supabaseが設定されていません。");
  if (records.length === 0) throw new Error("公開する対戦データがありません。");
  if (records.length > 5000) throw new Error("ゲスト公開は1回あたり5,000戦までです。");
  const token = createToken();
  const { error } = await supabase.rpc("create_guest_publication", { public_token: token, public_records: records });
  if (error) throw error;
  return `${window.location.origin}/share/${token}?guest=1`;
}
