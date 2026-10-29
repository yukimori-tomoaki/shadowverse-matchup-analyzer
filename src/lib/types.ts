// SHADOMAGI Chat v0.1 - 判断プロセスの型定義

export type CharacterId = 'mono' | 'tetra' | 'ennea' | 'dreizehn';

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  role: string;
  color: string; // UIのテーマカラー
  accentColor: string;
  avatarIcon: string;
  description: string;
}

// Phase 1: 質問の構造化
export interface StructuredQuestion {
  originalQuestion: string;
  goal: string; // 目的
  options: string[]; // 選択肢
  constraints: string[]; // 制約
  knownFacts: string[]; // 既知の事実
  unknowns: string[]; // 不明点
  criteria: string[]; // 判断基準
  assumptions: string[]; // 暫定判断のための仮定
  needsMoreInfo: boolean; // 結論を左右する重大な情報不足があるか
  suggestedQuestions?: string[]; // 追加質問の候補
}

// Phase 2: 3人格による独立した初回判断
export interface InitialOpinion {
  characterId: 'mono' | 'tetra' | 'ennea';
  initialConclusion: string; // 初回結論
  reasoning: string; // 判断理由
  concerns: string[]; // 懸念点
  missingInfo: string[]; // 不足情報
  changeConditions: string[]; // 結論を変更する条件
}

// Phase 3: 相互批評
export interface Critique {
  criticId: 'mono' | 'tetra' | 'ennea';
  agreements: string[]; // 他の人格との合意点
  disagreements: string[]; // 他の人格との対立点
  evidenceEvaluation: string; // 根拠の強弱
  counterArguments: string[]; // 有力な反論
  unresolvedIssues: string[]; // 未解決の問題
}

// Phase 4: 再検討
export type RevisionAction = 'maintain' | 'change' | 'suspend'; // 維持 | 変更 | 保留

export interface Revision {
  characterId: 'mono' | 'tetra' | 'ennea';
  action: RevisionAction;
  revisedConclusion: string; // 再検討後の結論（維持の場合は初回結論と同等）
  revisionReason: string; // スタンスを選んだ理由（変更の場合は何を理由に変更したか）
}

// Phase 5: ドライツェーンの最終判定
export type FinalDecisionType = 'adopt' | 'conditional' | 'suspend' | 'require_info';
// 採用 | 条件付き採用 | 保留 | 追加情報の要求

export interface FinalVerdict {
  decision: FinalDecisionType;
  finalConclusion: string; // 最終結論
  decisionReason: string; // 判断理由
  minorityOpinionsAndConcerns: string[]; // 少数意見や残る懸念
  overturnConditions: string[]; // 結論を覆す条件
  uncertainties: string[]; // 不確実性
}

// 全判断プロセスの統合結果
export interface MagiResult {
  id: string;
  createdAt: string;
  isMock: boolean; // モックデータ判定フラグ
  rawQuestion: string;
  phase1: StructuredQuestion;
  phase2: {
    mono: InitialOpinion;
    tetra: InitialOpinion;
    ennea: InitialOpinion;
  };
  phase3: {
    mono: Critique;
    tetra: Critique;
    ennea: Critique;
  };
  phase4: {
    mono: Revision;
    tetra: Revision;
    ennea: Revision;
  };
  phase5: FinalVerdict;
  apiError?: string; // API呼び出し失敗時の詳細エラーメッセージ
}
