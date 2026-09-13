"use client";

import { LogIn, LogOut, Users } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function AuthPanel({ onWorkspace }: { onWorkspace: (workspaceId: string | null) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) { startTransition(() => setWorkspaceId(null)); onWorkspace(null); return; }
    const client = supabase;
    void client.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).single().then(({ data, error }) => {
      if (data) { setWorkspaceId(data.workspace_id); onWorkspace(data.workspace_id); return; }
      if (error?.code !== "PGRST116") { setMessage("ワークスペースを確認できませんでした。Supabaseのschema.sqlを確認してください。"); return; }
      void client.from("workspaces").insert({ name: "My Matchup Workspace", owner_id: user.id }).select("id").single().then(({ data: workspace, error: workspaceError }) => {
        if (workspaceError || !workspace) { setMessage("ワークスペースを作成できませんでした。RLSポリシーを確認してください。"); return; }
        void client.from("workspace_members").insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" }).then(({ error: memberError }) => {
          if (memberError) { setMessage("ワークスペースのメンバー登録に失敗しました。RLSポリシーを確認してください。"); return; }
          setWorkspaceId(workspace.id); onWorkspace(workspace.id);
        });
      });
    });
  }, [onWorkspace, user]);

  if (!isSupabaseConfigured) return <span className="local-badge"><span />ローカルモード</span>;
  if (!user) return <form className="auth-form" onSubmit={async (event) => { event.preventDefault(); if (!supabase || !email) return; const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); setMessage(error ? error.message : "ログイン用リンクをメールで送信しました。"); }}><input aria-label="メールアドレス" type="email" placeholder="メールアドレス" value={email} onChange={(event) => setEmail(event.target.value)} required /><button className="button button-primary" type="submit"><LogIn size={15} />ログインリンク</button>{message && <small>{message}</small>}</form>;
  return <div className="account-panel"><span className="workspace-badge"><Users size={14} />共有ワークスペース</span><span className="account-email">{user.email}</span><button className="button button-ghost" onClick={() => { void supabase?.auth.signOut(); onWorkspace(null); }}><LogOut size={14} />ログアウト</button>{workspaceId && <span className="sync-dot" title="同期中" />}</div>;
}
