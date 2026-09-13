"use client";

import { FileUp, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { parseMatchCsv } from "@/lib/csvParser";
import type { MatchRecord } from "@/types/match";

export function CsvUploader({ onRecords, hasRecords, onError }: { onRecords: (records: MatchRecord[]) => void; hasRecords: boolean; onError: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const readFile = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const result = parseMatchCsv(String(reader.result)); onError(result.warnings.length ? `読み込み完了（一部スキップ: ${result.warnings.length}行）` : ""); onRecords(result.records); } catch (error) { onError(error instanceof Error ? error.message : "CSVを読み込めませんでした。"); } }; reader.readAsText(file, "UTF-8"); };
  return <div className={`upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); readFile(event.dataTransfer.files[0]); }}>
    <div className="upload-icon"><FileUp size={24} /></div>
    <div><p className="upload-title">対戦結果CSVをここにドラッグ＆ドロップ</p><p className="upload-subtitle">CSV / TSV・UTF-8対応。データはこのブラウザ内でのみ処理されます。</p></div>
    <button className="button button-primary" onClick={() => inputRef.current?.click()}><FileUp size={16} /> {hasRecords ? "CSVを追加" : "CSVファイルを選択"}</button>
    <input ref={inputRef} className="sr-only" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={(event) => readFile(event.target.files?.[0])} />
    <span className="privacy-note"><ShieldCheck size={14} /> 外部サーバーへ送信しません</span>
  </div>;
}
