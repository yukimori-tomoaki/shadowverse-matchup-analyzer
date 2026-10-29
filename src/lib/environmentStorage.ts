import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { MatchupEnvironment, EnvironmentInput } from "@/types/environment";

const LOCAL_STORAGE_KEY = "sv_matchup_environments";

export const DEFAULT_ENVIRONMENTS: MatchupEnvironment[] = [
  {
    id: "env-current",
    name: "新環境 (10/28〜)",
    startDate: "2026-10-28",
    endDate: null,
    isDefault: true,
  },
  {
    id: "env-previous",
    name: "前環境 (~10/27)",
    startDate: "2026-08-26",
    endDate: "2026-10-27",
    isDefault: false,
  },
];

type DbEnvironmentRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

function fromDbRow(row: DbEnvironmentRow): MatchupEnvironment {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadLocal(): MatchupEnvironment[] {
  if (typeof window === "undefined") return DEFAULT_ENVIRONMENTS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_ENVIRONMENTS));
      return DEFAULT_ENVIRONMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ENVIRONMENTS;
  } catch {
    return DEFAULT_ENVIRONMENTS;
  }
}

function saveLocal(envs: MatchupEnvironment[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(envs));
  } catch (e) {
    console.error("Failed to save environments to localStorage:", e);
  }
}

export async function fetchEnvironments(): Promise<MatchupEnvironment[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocal();
  }

  try {
    const { data, error } = await supabase
      .from("matchup_environments")
      .select("*")
      .order("start_date", { ascending: false });

    if (error || !data || data.length === 0) {
      // If table doesn't exist yet or is empty, fallback to local/default
      const local = loadLocal();
      return local;
    }

    const envs = data.map(fromDbRow);
    saveLocal(envs);
    return envs;
  } catch (err) {
    console.warn("fetchEnvironments fallback to local storage:", err);
    return loadLocal();
  }
}

export async function saveEnvironment(input: EnvironmentInput): Promise<MatchupEnvironment> {
  const id = input.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `env-${Date.now()}`);

  const item: MatchupEnvironment = {
    id,
    name: input.name.trim(),
    startDate: input.startDate,
    endDate: input.endDate ? input.endDate : null,
    isDefault: !!input.isDefault,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      if (item.isDefault) {
        // Clear previous default
        await supabase.from("matchup_environments").update({ is_default: false }).neq("id", id);
      }

      const { data, error } = await supabase
        .from("matchup_environments")
        .upsert({
          id: item.id,
          name: item.name,
          start_date: item.startDate,
          end_date: item.endDate,
          is_default: item.isDefault,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      if (data) {
        const result = fromDbRow(data);
        const currentList = loadLocal().filter((e) => e.id !== id);
        if (result.isDefault) {
          currentList.forEach((e) => (e.isDefault = false));
        }
        saveLocal([result, ...currentList]);
        return result;
      }
    } catch (e) {
      console.warn("Supabase upsert failed, saving locally:", e);
    }
  }

  // Local fallback
  const current = loadLocal();
  let updated = current.filter((e) => e.id !== id);
  if (item.isDefault) {
    updated = updated.map((e) => ({ ...e, isDefault: false }));
  }
  updated.unshift(item);
  saveLocal(updated);
  return item;
}

export async function deleteEnvironment(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("matchup_environments").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete failed, deleting locally:", e);
    }
  }
  const current = loadLocal();
  const next = current.filter((e) => e.id !== id);
  // Ensure at least one is default if we deleted the default one
  if (next.length > 0 && !next.some((e) => e.isDefault)) {
    next[0].isDefault = true;
  }
  saveLocal(next);
}

export async function setDefaultEnvironment(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.rpc("set_default_environment", { target_id: id });
    } catch {
      // Fallback update
      try {
        await supabase.from("matchup_environments").update({ is_default: false }).neq("id", id);
        await supabase.from("matchup_environments").update({ is_default: true }).eq("id", id);
      } catch (e) {
        console.warn("Supabase setDefaultEnvironment failed:", e);
      }
    }
  }

  const current = loadLocal();
  const next = current.map((e) => ({
    ...e,
    isDefault: e.id === id,
  }));
  saveLocal(next);
}
