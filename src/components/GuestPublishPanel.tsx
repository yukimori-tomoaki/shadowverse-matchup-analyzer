"use client";

import { Copy, Globe2 } from "lucide-react";
import { useState } from "react";
import { publishGuestMatches } from "@/lib/guestPublish";
import type { MatchRecord } from "@/types/match";

export function GuestPublishPanel({ records, onPublished }: { records: MatchRecord[]; onPublished?: (token: string) => void }) {
  const [shareUrl, setShareUrl] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const publish = async () => {
    try { setWorking(true); setMessage(""); const result = await publishGuestMatches(records); setShareUrl(result.url); onPublished?.(result.token); }
    catch (error) { setMessage(error instanceof Error ? error.message : "公開URLを作成できませんでした。"); }
    finally { setWorking(false); }
  };
  const copy = async () => { if (!shareUrl) return; await navigator.clipboard.writeText(shareUrl); setMessage("公開URLをコピーしました。"); };

  return <div className="share-panel guest-share-panel"><div><span className="eyebrow"><Globe2 size={13} /> GUEST PUBLIC VIEW</span><p>ログインなしで相性表を公開</p><small>このブラウザで読み込んだデータを閲覧専用URLに公開します。最大5,000戦。</small></div>{shareUrl ? <div className="share-result"><input readOnly value={shareUrl} aria-label="公開URL" /><button className="button button-ghost" onClick={() => void copy()}><Copy size={14} />コピー</button></div> : <button className="button button-primary" onClick={() => void publish()} disabled={working}><Globe2 size={15} />{working ? "公開中..." : "公開URLを作成"}</button>}{message && <small className="share-message">{message}</small>}</div>;
}
