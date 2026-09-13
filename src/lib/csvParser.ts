import Papa from "papaparse";
import type { MatchRecord, MatchResult } from "@/types/match";

const REQUIRED_COLUMNS = [
  "記録日時(YYYY-MM-DD HH:mm:ss)",
  "フォーマット",
  "自分デッキ",
  "相手デッキ",
  "手番",
  "勝敗",
  "メモ",
];

export type CsvParseResult = {
  records: MatchRecord[];
  warnings: string[];
};

const normalizeHeader = (value: string) => value.replace(/^\uFEFF/, "").trim();
const normalizeResult = (value: string): MatchResult | null => {
  const normalized = value.trim().toUpperCase();
  if (normalized === "WIN") return "WIN";
  if (normalized === "LOSS" || normalized === "LOSE") return "LOSS";
  return null;
};

export function parseMatchCsv(text: string): CsvParseResult {
  if (!text.trim()) throw new Error("CSVファイルが空です。");

  const delimiter = text.split(/\r?\n/, 1)[0]?.includes("\t") ? "\t" : ",";
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter,
    transformHeader: normalizeHeader,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSVとして解析できませんでした。${parsed.errors[0]?.message ? ` ${parsed.errors[0].message}` : ""}`);
  }

  const headers = parsed.meta.fields ?? [];
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`CSVを読み込めませんでした。\n不足している列：\n「${missingColumns.join("」「")}」`);
  }

  const warnings: string[] = [];
  const records: MatchRecord[] = [];
  parsed.data.forEach((row, index) => {
    const line = index + 2;
    const recordedAt = row["記録日時(YYYY-MM-DD HH:mm:ss)"]?.trim() ?? "";
    const format = row["フォーマット"]?.trim() ?? "";
    const myDeck = row["自分デッキ"]?.trim() ?? "";
    const opponentDeck = row["相手デッキ"]?.trim() ?? "";
    const result = normalizeResult(row["勝敗"] ?? "");
    if (!myDeck || !opponentDeck || !result) {
      const issues = [!myDeck && "自分デッキが空", !opponentDeck && "相手デッキが空", !result && "勝敗がWIN/LOSS/LOSE以外"].filter(Boolean);
      warnings.push(`${line}行目: ${issues.join("、")}`);
      return;
    }

    records.push({
      id: `${recordedAt}-${format}-${myDeck}-${opponentDeck}-${row["手番"] ?? ""}-${result}-${index}`,
      date: recordedAt,
      format,
      myDeck,
      opponentDeck,
      turn: row["手番"]?.trim() || "不明",
      result,
      memo: row["メモ"]?.trim() ?? "",
    });
  });

  if (records.length === 0) throw new Error("有効な対戦データがありません。列の内容を確認してください。");
  return { records, warnings };
}
