import { getOpenAIClient, getModelName, getMaxTokens } from './openai';
import { MagiResult, StructuredQuestion, InitialOpinion, Critique, Revision, FinalVerdict } from './types';
import { generateMockMagiResult } from './mockData';
import { MONO_SYSTEM_PROMPT } from '@/prompts/mono';
import { TETRA_SYSTEM_PROMPT } from '@/prompts/tetra';
import { ENNEA_SYSTEM_PROMPT } from '@/prompts/ennea';
import { DREIZEHN_SYSTEM_PROMPT } from '@/prompts/dreizehn';

/**
 * JSON文字列をパースするヘルパー（Markdownのコードブロックなどを除去）
 */
function parseJson<T>(content: string): T {
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

/**
 * MAGI システムの完全審議パイプライン
 */
export async function executeMagiPipeline(question: string): Promise<MagiResult> {
  const openai = getOpenAIClient();
  const trimmedQuestion = question.trim();

  // APIクライアントが未初期化（APIキー未設定）の場合はモックデータを返す
  if (!openai) {
    return generateMockMagiResult(trimmedQuestion);
  }

  const model = getModelName();
  const maxTokens = getMaxTokens();

  try {
    // -------------------------------------------------------------
    // Phase 1: 質問の論理構造化 (1回のAPI呼び出し)
    // -------------------------------------------------------------
    const phase1Prompt = `
以下のユーザーからの相談内容を分析し、論理的な判断材料として構造化してください。
必ず次のJSONフォーマットのみを出力してください。Markdownや余計な解説は不要です。

{
  "goal": "目的（何を目指しているか）",
  "options": ["選択肢1", "選択肢2"],
  "constraints": ["制約1", "制約2"],
  "knownFacts": ["既知の事実1", "既知の事実2"],
  "unknowns": ["不明点1", "不明点2"],
  "criteria": ["判断基準1", "判断基準2"],
  "assumptions": ["不足情報を補う仮定（あれば）"],
  "needsMoreInfo": false,
  "suggestedQuestions": ["追加で確認したい質問（あれば）"]
}

相談内容:
${trimmedQuestion}
`;

    const phase1Response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: phase1Prompt }],
      max_tokens: maxTokens,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const phase1Data = parseJson<Omit<StructuredQuestion, 'originalQuestion'>>(
      phase1Response.choices[0]?.message?.content || '{}'
    );

    const structuredQuestion: StructuredQuestion = {
      originalQuestion: trimmedQuestion,
      goal: phase1Data.goal || '目的の達成',
      options: phase1Data.options || ['案A', '案B'],
      constraints: phase1Data.constraints || [],
      knownFacts: phase1Data.knownFacts || [],
      unknowns: phase1Data.unknowns || [],
      criteria: phase1Data.criteria || [],
      assumptions: phase1Data.assumptions || [],
      needsMoreInfo: Boolean(phase1Data.needsMoreInfo),
      suggestedQuestions: phase1Data.suggestedQuestions || [],
    };

    // -------------------------------------------------------------
    // Phase 2: 3人格による独立した初回判断 (3回の並列呼び出し)
    // -------------------------------------------------------------
    const characters = [
      { id: 'mono' as const, systemPrompt: MONO_SYSTEM_PROMPT },
      { id: 'tetra' as const, systemPrompt: TETRA_SYSTEM_PROMPT },
      { id: 'ennea' as const, systemPrompt: ENNEA_SYSTEM_PROMPT },
    ];

    const phase2Promises = characters.map(async (char) => {
      const prompt = `
あなたはあなた自身の人格・哲学に基づき、他の人格の意見を見ずに【独立して】初回判断を行ってください。
必ず次のJSONフォーマットのみを出力してください。

{
  "initialConclusion": "あなたの口調での初回結論",
  "reasoning": "判断の理由",
  "concerns": ["懸念点1", "懸念点2"],
  "missingInfo": ["判断に不足している情報"],
  "changeConditions": ["結論を変更する条件"]
}

相談内容:
${trimmedQuestion}

構造化された前提:
- 目的: ${structuredQuestion.goal}
- 選択肢: ${structuredQuestion.options.join(' / ')}
- 制約: ${structuredQuestion.constraints.join(' / ')}
- 判断基準: ${structuredQuestion.criteria.join(' / ')}
`;

      const res = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: char.systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const parsed = parseJson<Omit<InitialOpinion, 'characterId'>>(
        res.choices[0]?.message?.content || '{}'
      );

      return {
        characterId: char.id,
        initialConclusion: parsed.initialConclusion || '判断中',
        reasoning: parsed.reasoning || '',
        concerns: parsed.concerns || [],
        missingInfo: parsed.missingInfo || [],
        changeConditions: parsed.changeConditions || [],
      };
    });

    const [monoInit, tetraInit, enneaInit] = await Promise.all(phase2Promises);

    const initialOpinions = {
      mono: monoInit,
      tetra: tetraInit,
      ennea: enneaInit,
    };

    // -------------------------------------------------------------
    // Phase 3 & 4: 相互批評と再検討 (呼び出し回数を抑えるため各人格1回ずつ並列実行 = 3回)
    // -------------------------------------------------------------
    const phase3And4Promises = characters.map(async (char) => {
      const otherOpinions = characters
        .filter((c) => c.id !== char.id)
        .map((c) => {
          const op = initialOpinions[c.id];
          return `【${c.id}の初回意見】: ${op.initialConclusion}\n理由: ${op.reasoning}`;
        })
        .join('\n\n');

      const prompt = `
他の人格の初回意見を共有します。
あなたの人格・立場から、これらを客観的かつ真摯に批評した上で、自らの初回結論を「維持」「変更」「保留」のいずれかに再検討してください。

他の人格の意見:
${otherOpinions}

あなたの初回結論:
${initialOpinions[char.id].initialConclusion}

必ず次のJSONフォーマットのみを出力してください。
{
  "critique": {
    "agreements": ["合意できる点"],
    "disagreements": ["対立する点・疑問点"],
    "evidenceEvaluation": "他者の根拠の強弱の評価",
    "counterArguments": ["有力な反論"],
    "unresolvedIssues": ["未解決の問題"]
  },
  "revision": {
    "action": "maintain または change または suspend",
    "revisedConclusion": "再検討後の結論（維持なら初回結論と同等、変更なら新しい結論）",
    "revisionReason": "なぜ維持または変更したのかの理由"
  }
}
`;

      const res = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: char.systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const parsed = parseJson<{
        critique: Omit<Critique, 'criticId'>;
        revision: Omit<Revision, 'characterId'>;
      }>(res.choices[0]?.message?.content || '{}');

      const critique: Critique = {
        criticId: char.id,
        agreements: parsed.critique?.agreements || [],
        disagreements: parsed.critique?.disagreements || [],
        evidenceEvaluation: parsed.critique?.evidenceEvaluation || '',
        counterArguments: parsed.critique?.counterArguments || [],
        unresolvedIssues: parsed.critique?.unresolvedIssues || [],
      };

      const revision: Revision = {
        characterId: char.id,
        action: parsed.revision?.action || 'maintain',
        revisedConclusion: parsed.revision?.revisedConclusion || initialOpinions[char.id].initialConclusion,
        revisionReason: parsed.revision?.revisionReason || '現状維持と判断',
      };

      return { id: char.id, critique, revision };
    });

    const [monoRe, tetraRe, enneaRe] = await Promise.all(phase3And4Promises);

    const critiques = {
      mono: monoRe.critique,
      tetra: tetraRe.critique,
      ennea: enneaRe.critique,
    };

    const revisions = {
      mono: monoRe.revision,
      tetra: tetraRe.revision,
      ennea: enneaRe.revision,
    };

    // -------------------------------------------------------------
    // Phase 5: ドライツェーンの最終判定 (1回の呼び出し)
    // -------------------------------------------------------------
    const dreizehnPrompt = `
あなたは調停者ドライツェーンです。三姉妹の議論を多角的に検証し、独自の調停基準で最終判定を下してください。
多数決に流されず、真の目的と根拠の妥当性から独立して裁定してください。

相談内容:
${trimmedQuestion}

三姉妹の初回判断と再検討結果:
- モノ: 初回「${initialOpinions.mono.initialConclusion}」 -> 再検討「${revisions.mono.revisedConclusion}」(${revisions.mono.action})
- テトラ: 初回「${initialOpinions.tetra.initialConclusion}」 -> 再検討「${revisions.tetra.revisedConclusion}」(${revisions.tetra.action})
- エンネア: 初回「${initialOpinions.ennea.initialConclusion}」 -> 再検討「${revisions.ennea.revisedConclusion}」(${revisions.ennea.action})

必ず次のJSONフォーマットのみを出力してください。
{
  "decision": "adopt または conditional または suspend または require_info",
  "finalConclusion": "ドライツェーンの口調での最終結論",
  "decisionReason": "判定の理由",
  "minorityOpinionsAndConcerns": ["少数意見や残る懸念"],
  "overturnConditions": ["結論を覆す条件"],
  "uncertainties": ["残る不確実性"]
}
`;

    const phase5Response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: DREIZEHN_SYSTEM_PROMPT },
        { role: 'user', content: dreizehnPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });

    const phase5Data = parseJson<FinalVerdict>(
      phase5Response.choices[0]?.message?.content || '{}'
    );

    const finalVerdict: FinalVerdict = {
      decision: phase5Data.decision || 'conditional',
      finalConclusion: phase5Data.finalConclusion || '審議終了',
      decisionReason: phase5Data.decisionReason || '',
      minorityOpinionsAndConcerns: phase5Data.minorityOpinionsAndConcerns || [],
      overturnConditions: phase5Data.overturnConditions || [],
      uncertainties: phase5Data.uncertainties || [],
    };

    return {
      id: `real-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isMock: false,
      rawQuestion: trimmedQuestion,
      phase1: structuredQuestion,
      phase2: initialOpinions,
      phase3: critiques,
      phase4: revisions,
      phase5: finalVerdict,
    };
  } catch (err: unknown) {
    console.error('MAGI pipeline OpenAI error, falling back to mock:', err);
    let errorDetail = 'OpenAI API呼び出しエラーが発生したため、モックデータで審議を表示しています。';

    if (err && typeof err === 'object') {
      const anyErr = err as Record<string, unknown>;
      if (anyErr.status === 429 || anyErr.code === 'credit_balance_exhausted' || anyErr.type === 'insufficient_quota') {
        errorDetail = '【OpenAIクレジット残高不足 (429)】APIキーは正常に認識されましたが、OpenAIアカウントのクレジット残高が $0 です。https://platform.openai.com/settings/organization/billing にてクレジットをチャージ（$5等）すると、実機AIが即座に動作します。';
      } else if (anyErr.status === 401) {
        errorDetail = '【APIキー認証エラー (401)】設定されたOPENAI_API_KEYが無効です。キーをご確認ください。';
      } else if (anyErr.message) {
        errorDetail = `【OpenAIエラー】${anyErr.message}`;
      }
    }

    // エラー時はユーザーが止まらないようモックにフォールバック（画面上にはモック表示される）
    return {
      ...generateMockMagiResult(trimmedQuestion),
      id: `fallback-${Date.now()}`,
      isMock: true,
      apiError: errorDetail,
    };
  }
}
