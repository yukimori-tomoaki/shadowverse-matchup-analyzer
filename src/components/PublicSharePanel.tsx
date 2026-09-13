"use client";

import { Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

function createToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function PublicSharePanel({ workspaceId }: { workspaceId: string }) {
  const [shareUrl, setShareUrl] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const createShare = async () => {
    if (!supabase) return;
    setWorking(true);
    const token = createToken();
    const { error } = await supabase.from("public_shares").insert({ token, workspace_id: workspaceId, enabled: true });
    if (error) setMessage("公開URLを作成できませんでした。Supabaseの公開設定を確認してください。");
    else setShareUrl(`${window.location.origin}/share/${token}`);
    setWorking(false);
  };

  const copyUrl = async () => { if (!shareUrl) return; await navigator.clipboard.writeText(shareUrl); setMessage("公開URLをコピーしました。"); };

  return <div className="share-panel"><div><span className="eyebrow"><Link2 size={13} /> PUBLIC VIEW</span><p>相性表をログイン不要で公開</p><small>URLを知っている人だけが閲覧できます。編集権限は公開されません。</small></div>{shareUrl ? <div className="share-result"><input readOnly value={shareUrl} aria-label="公開URL" /><button className="button button-ghost" onClick={() => void copyUrl()}><Copy size={14} />コピー</button></div> : <button className="button button-primary" onClick={() => void createShare()} disabled={working}><Link2 size={15} />{working ? "作成中..." : "公開URLを作成"}</button>}{message && <small className="share-message">{message}</small>}</div>;
}
