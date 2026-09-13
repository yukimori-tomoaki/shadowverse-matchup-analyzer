import type { MatchRecord } from "@/types/match";
import { supabase } from "@/lib/supabase";

const TOKEN_KEY = "shadowverse-guest-public-token-v1";

function createToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function publishGuestMatches(records: MatchRecord[]) {
  if (!supabase) throw new Error("Supabaseが設定されていません。");
  if (records.length === 0) throw new Error("公開する対戦データがありません。");
  if (records.length > 5000) throw new Error("ゲスト公開は1回あたり5,000戦までです。");
  const currentToken = getGuestToken();
  const token = currentToken || createToken();
  const rpc = currentToken ? "update_guest_publication" : "create_guest_publication";
  const { error } = await supabase.rpc(rpc, { public_token: token, public_records: records });
  if (error) throw error;
  window.localStorage.setItem(TOKEN_KEY, token);
  return { token, url: `${window.location.origin}/share/${token}?guest=1` };
}

export function getGuestToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(TOKEN_KEY) ?? "";
}
