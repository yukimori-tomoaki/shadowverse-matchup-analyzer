import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { ClassKey } from "@/types/classIcon";
import { CLASS_METAS } from "@/constants/classIcons";

const STORAGE_BUCKET = "class-icons";
const LOCAL_STORAGE_KEY = "sv_class_icon_settings";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

function loadLocalIcons(): Record<ClassKey, string> {
  if (typeof window === "undefined") {
    return {} as Record<ClassKey, string>;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {} as Record<ClassKey, string>;
    return JSON.parse(raw);
  } catch {
    return {} as Record<ClassKey, string>;
  }
}

function saveLocalIcons(icons: Record<ClassKey, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(icons));
  } catch (e) {
    console.error("Failed to save class icons to localStorage:", e);
  }
}

export async function fetchClassIconSettings(): Promise<Record<ClassKey, string>> {
  const local = loadLocalIcons();

  if (!isSupabaseConfigured || !supabase) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from("class_icon_settings")
      .select("class_key, public_url");

    if (error || !data) {
      return local;
    }

    const result: Record<ClassKey, string> = { ...local };
    for (const row of data) {
      if (row.class_key && row.public_url) {
        result[row.class_key as ClassKey] = row.public_url;
      }
    }

    saveLocalIcons(result);
    return result;
  } catch (err) {
    console.warn("fetchClassIconSettings fallback:", err);
    return local;
  }
}

export async function uploadClassIcon(
  classKey: ClassKey,
  file: File
): Promise<string> {
  // 1. Validation
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `許可されていないファイル形式です (${file.type || "不明"})。PNG, JPEG, WebP, SVG形式を使用してください。`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `ファイルサイズが上限（2MB）を超えています (${(file.size / (1024 * 1024)).toFixed(2)}MB)。`
    );
  }

  const meta = CLASS_METAS[classKey];
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
  const filePath = `${classKey}/${uniqueId}.${extension}`;

  let publicUrl = "";

  if (isSupabaseConfigured && supabase) {
    try {
      // 2. Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`ストレージへのアップロードに失敗しました: ${uploadError.message}`);
      }

      // 3. Get Public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      publicUrl = urlData.publicUrl;

      // 4. Record to Database table
      const { error: dbError } = await supabase
        .from("class_icon_settings")
        .upsert({
          class_key: classKey,
          class_name: meta.name,
          storage_path: filePath,
          public_url: publicUrl,
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        console.warn("DB record error, proceeding with storage url:", dbError);
      }
    } catch (error) {
      console.warn("Supabase upload failed, falling back to local base64:", error);
      publicUrl = await readFileAsDataUrl(file);
    }
  } else {
    // Local / offline mode: Convert to data URL
    publicUrl = await readFileAsDataUrl(file);
  }

  // Update local storage
  const current = loadLocalIcons();
  current[classKey] = publicUrl;
  saveLocalIcons(current);

  return publicUrl;
}

export async function resetClassIcon(classKey: ClassKey): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      // Get existing path to clean up
      const { data } = await supabase
        .from("class_icon_settings")
        .select("storage_path")
        .eq("class_key", classKey)
        .single();

      if (data?.storage_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([data.storage_path]);
      }

      await supabase.from("class_icon_settings").delete().eq("class_key", classKey);
    } catch (e) {
      console.warn("Supabase resetClassIcon failed:", e);
    }
  }

  const current = loadLocalIcons();
  delete current[classKey];
  saveLocalIcons(current);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました。"));
    reader.readAsDataURL(file);
  });
}
