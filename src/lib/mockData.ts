import { MagiResult } from './types';
import { MONO_PROFILE } from '@/prompts/mono';
import { TETRA_PROFILE } from '@/prompts/tetra';
import { ENNEA_PROFILE } from '@/prompts/ennea';
import { DREIZEHN_PROFILE } from '@/prompts/dreizehn';

export const SAMPLE_QUESTIONS = [
  '週末の大会で、勝率理論値は高いがプレイミスの許されないデッキAを使うか、安定感重視でミスが少ないデッキBを使うべきか？',
  '新弾環境の初期、既存デッキを微調整して潜るべきか、未知の新テーマを研究して特化構築を作るべきか？',
  '日々のランクマッチ周回において、短期決戦のアグロで試行回数を稼ぐべきか、勝率6割超を目指す重厚なコントロールで手堅く登るべきか？',
];

export function generateMockMagiResult(userQuestion: string): MagiResult {
  const query = userQuestion.trim() || SAMPLE_QUESTIONS[0];

  return {
    id: `mock-${Date.now()}`,
    createdAt: new Date().toISOString(),
    isMock: true,
    rawQuestion: query,
    // Phase 1: 質問の構造化
    phase1: {
      originalQuestion: query,
      goal: '限られたリソースや本番環境において、後悔のない最大の成果と納得を得るための選択',
      options: [
        '案A：高リスク・高リターンの挑戦的アプローチ（理論値・爆発力重視）',
        '案B：低リスク・高再現性の堅実アプローチ（安定性・心理負担軽減重視）',
      ],
      constraints: [
        '本番までの準備時間は有限である',
        'プレイヤー自身の精神的疲労度と集中力の持続限界が存在する',
      ],
      knownFacts: [
        '理論値が高い選択肢は、正確なプレイ判断を連続して要求される',
        '安定型の選択肢は、下振れや予期せぬ対面への耐性が比較的高い',
      ],
      unknowns: [
        '本番当日の対戦相手のメタ分布（流行デッキの偏り）',
        'プレイヤー自身の当日のメンタルコンディションや練習量',
      ],
      criteria: [
        '期待勝率の最大化',
        '長丁場の戦いにおける疲労マネジメント',
        '失敗した際の後悔の小ささと得られる経験値',
      ],
      assumptions: [
        '仮定：本番は複数ラウンドの連戦であり、疲労が後半ラウンドの判断に影響を及ぼす',
      ],
      needsMoreInfo: false,
      suggestedQuestions: [
        '過去の大会でプレッシャーに強いタイプか、疲労でミスが増えやすいタイプか？',
      ],
    },

    // Phase 2: 3人格による独立した初回判断 (prompts/*.ts から直結)
    phase2: {
      mono: {
        characterId: 'mono',
        ...MONO_PROFILE.mockInitialOpinion,
      },
      tetra: {
        characterId: 'tetra',
        ...TETRA_PROFILE.mockInitialOpinion,
      },
      ennea: {
        characterId: 'ennea',
        ...ENNEA_PROFILE.mockInitialOpinion,
      },
    },

    // Phase 3: 相互批評 (prompts/*.ts から直結)
    phase3: {
      mono: {
        criticId: 'mono',
        ...MONO_PROFILE.mockCritique,
      },
      tetra: {
        criticId: 'tetra',
        ...TETRA_PROFILE.mockCritique,
      },
      ennea: {
        criticId: 'ennea',
        ...ENNEA_PROFILE.mockCritique,
      },
    },

    // Phase 4: 再検討 (prompts/*.ts から直結)
    phase4: {
      mono: {
        characterId: 'mono',
        ...MONO_PROFILE.mockRevision,
      },
      tetra: {
        characterId: 'tetra',
        ...TETRA_PROFILE.mockRevision,
      },
      ennea: {
        characterId: 'ennea',
        ...ENNEA_PROFILE.mockRevision,
      },
    },

    // Phase 5: ドライツェーンの最終判定 (dreizehn.ts から直結)
    phase5: {
      ...DREIZEHN_PROFILE.mockVerdict,
    },
  };
}
