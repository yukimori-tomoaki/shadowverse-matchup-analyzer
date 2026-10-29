'use client';

import React, { useState } from 'react';
import { CHARACTERS } from '@/lib/characters';
import { MagiResult, CharacterId, RevisionAction, FinalDecisionType } from '@/lib/types';
import { generateMockMagiResult, SAMPLE_QUESTIONS } from '@/lib/mockData';

export default function ShadomagiPage() {
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [result, setResult] = useState<MagiResult | null>(() => generateMockMagiResult(SAMPLE_QUESTIONS[0]));
  const [activeTab, setActiveTab] = useState<'all' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5'>('all');
  const [expandedCharacter, setExpandedCharacter] = useState<CharacterId | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 初回マウント時にサーバーのAPIキー設定状況を確認
  React.useEffect(() => {
    fetch('/api/magi')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.hasApiKey === 'boolean') {
          setHasApiKey(data.hasApiKey);
        }
      })
      .catch((err) => console.error('Status check error:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);

    // 審議の段階的な進行演出
    const phases = [
      'Phase 1: 質問を論理構造化中...',
      'Phase 2: モノ・テトラ・エンネアが独立して初回判断中...',
      'Phase 3: 3姉妹による相互批評（合意・対立点の抽出）中...',
      'Phase 4: 批評を踏まえた結論の再検討中...',
      'Phase 5: ドライツェーンが最終判定を策定中...',
    ];

    let currentPhaseIdx = 0;
    const phaseInterval = setInterval(() => {
      if (currentPhaseIdx < phases.length) {
        setLoadingPhase(phases[currentPhaseIdx]);
        currentPhaseIdx++;
      }
    }, 600);

    try {
      const response = await fetch('/api/magi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      clearInterval(phaseInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '審議サーバーとの通信に失敗しました。');
      }

      const data = await response.json();
      if (data.result) {
        setResult(data.result);
        if (typeof data.hasApiKey === 'boolean') {
          setHasApiKey(data.hasApiKey);
        }
      } else {
        throw new Error('審議結果の形式が不正です。');
      }
    } catch (err: unknown) {
      clearInterval(phaseInterval);
      console.error('Submit error:', err);
      // 通信エラー時もユーザーの体験を止めないよう、ローカルモックにフォールバック
      const mockResult = generateMockMagiResult(question);
      setResult(mockResult);
      setErrorMessage(
        err instanceof Error
          ? `${err.message} （ローカルのシミュレーションデータを表示します）`
          : '通信エラーが発生したため、シミュレーションデータを表示します。'
      );
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  const getDecisionBadge = (decision: FinalDecisionType) => {
    switch (decision) {
      case 'adopt':
        return { label: '採用 (ADOPT)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.5)' };
      case 'conditional':
        return { label: '条件付き採用 (CONDITIONAL)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.55)' };
      case 'suspend':
        return { label: '保留 (SUSPEND)', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.5)' };
      case 'require_info':
        return { label: '追加情報の要求 (INFO REQUIRED)', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.5)' };
    }
  };

  const getActionBadge = (action: RevisionAction) => {
    switch (action) {
      case 'maintain':
        return <span className="action-chip action-maintain">維持 (MAINTAIN)</span>;
      case 'change':
        return <span className="action-chip action-change">変更 (REVISED)</span>;
      case 'suspend':
        return <span className="action-chip action-suspend">保留 (SUSPEND)</span>;
    }
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.6), #060b13 70%)' }}>
      {/* ナビゲーションバー */}
      <header className="topbar" style={{ borderBottom: '1px solid rgba(80, 217, 239, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #f43f5e 0%, #0ea5e9 50%, #f59e0b 100%)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 18,
              color: '#fff',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.35)',
            }}
          >
            M
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', color: '#f1f5f9' }}>
                SHADOMAGI CHAT
              </h1>
              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#1e293b', color: '#94a3b8' }}>
                v0.1
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
              Shadowverse 4人格 意思決定審議システム
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {result?.apiError ? (
            <div
              className="magi-badge"
              style={{
                background: 'rgba(239, 68, 68, 0.18)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: '#f87171',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)',
              }}
            >
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
              APIエラー (モック表示)
            </div>
          ) : hasApiKey ? (
            <div
              className="magi-badge"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)',
              }}
            >
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              OpenAI API 接続中 (実機AI判定)
            </div>
          ) : (
            <div className="magi-badge magi-badge-mock">
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
              モック動作中 (APIキー未設定)
            </div>
          )}
        </div>
      </header>

      <main className="shadomagi-container">
        {/* モード案内バナー */}
        {result?.apiError ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: '14px 20px',
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15), rgba(15, 23, 42, 0.85))',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <strong style={{ display: 'block', fontSize: 13, color: '#f87171', marginBottom: 4 }}>
                OpenAI API接続に関するお知らせ
              </strong>
              <p style={{ margin: 0, fontSize: 12, color: '#fca5a5', lineHeight: 1.6 }}>
                {result.apiError}
              </p>
            </div>
          </div>
        ) : hasApiKey ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 20px',
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.8))',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 24 }}>✨</span>
            <div>
              <strong style={{ display: 'block', fontSize: 13, color: '#34d399' }}>
                OpenAI API 連携モードで動作中
              </strong>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                APIキーが認識されました。ユーザーの入力に対して、モノ・テトラ・エンネア・ドライツェーンの各AIがリアルタイムに独立判断・相互批評・最終判定を実行します。
              </p>
            </div>
          </div>
        ) : (
          <div className="magi-banner-mock">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: 24 }}>💡</span>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#fcd34d' }}>
                  現在は「モックモード」で起動しています
                </strong>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                  OpenAI APIキー未設定でもUIと判断プロセスの挙動を確認できるよう、設定書に基づいたシミュレーションデータを表示しています。
                  実際のAI判断を行うには <code>.env.local</code> に <code>OPENAI_API_KEY</code> を設定してください。
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div style={{ padding: '10px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, color: '#fca5a5', fontSize: 12, marginBottom: 20 }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 4人格紹介バー & 設定書プレビュー */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>👥</span> 審議AI人格設定（src/prompts/*.ts と直結）
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              ※カードをクリックすると、読み込まれている設定書・台詞例を確認できます
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {(['mono', 'tetra', 'ennea', 'dreizehn'] as CharacterId[]).map((id) => {
              const char = CHARACTERS[id];
              const isExpanded = expandedCharacter === id;

              return (
                <div
                  key={id}
                  onClick={() => setExpandedCharacter(isExpanded ? null : id)}
                  style={{
                    background: isExpanded ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.65)',
                    border: `1px solid ${isExpanded ? char.color : id === 'dreizehn' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(51, 65, 85, 0.6)'}`,
                    boxShadow: isExpanded ? `0 0 20px ${char.color}33` : 'none',
                    borderRadius: 10,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 24, padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                      {char.avatarIcon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: 15, color: '#f8fafc' }}>{char.name}</strong>
                          <span
                            style={{
                              fontSize: 10,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: `${char.color}22`,
                              color: char.color,
                              border: `1px solid ${char.color}44`,
                            }}
                          >
                            {char.role}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: char.color }}>
                          {isExpanded ? '▲ 閉じる' : '▼ 設定書'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                        {char.description}
                      </p>
                    </div>
                  </div>

                  {/* 設定書展開アコーディオン */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                        fontSize: 11,
                        color: '#cbd5e1',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: char.color, fontWeight: 700 }}>■ 一人称：</span> {char.firstPerson}
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: char.color, fontWeight: 700 }}>■ 人格の核・理念：</span>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: 4, marginTop: 4, fontStyle: 'italic', color: '#e2e8f0' }}>
                          {char.corePhilosophy}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: char.color, fontWeight: 700 }}>■ 反映されている台詞例：</span>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 16, lineHeight: 1.5, color: '#94a3b8' }}>
                          {char.toneExamples.map((ex, i) => (
                            <li key={i}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', textAlign: 'right' }}>
                        設定ファイル: <code>src/prompts/{id}.ts</code>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 質問入力カード */}
        <section className="magi-hero-card" style={{ marginBottom: 36 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>
            意思決定の相談・質問を入力
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#94a3b8' }}>
            目的、迷っている選択肢、前提条件などを自由に入力してください。MAGIシステムが5つの段階を経て審議します。
          </p>

          {/* サンプル質問ピッカー */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 600 }}>
              サンプル質問から選ぶ：
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SAMPLE_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuestion(q)}
                  style={{
                    background: question === q ? 'rgba(80, 217, 239, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${question === q ? 'var(--cyan)' : 'rgba(71, 85, 105, 0.6)'}`,
                    color: question === q ? 'var(--cyan)' : '#cbd5e1',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  例{idx + 1}: {q.slice(0, 32)}...
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="判断に悩んでいる内容を入力してください（例: 週末の大会でどちらのデッキを使うべきか？ など）"
              rows={3}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 8,
                background: '#090e17',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                fontSize: 14,
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                文字数: {question.length} 字
              </div>
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                style={{
                  background: isLoading
                    ? '#334155'
                    : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: '1px solid rgba(80, 217, 239, 0.4)',
                  boxShadow: isLoading ? 'none' : '0 0 20px rgba(14, 165, 233, 0.35)',
                  color: '#fff',
                  padding: '12px 28px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '0.04em',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.2s',
                }}
              >
                {isLoading ? (
                  <>
                    <span className="animate-pulse-glow">⚙️</span>
                    審議実行中...
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    MAGI 審議開始 (モック実行)
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ローディング進行ステータス */}
        {isLoading && (
          <div
            style={{
              padding: 24,
              borderRadius: 12,
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(80, 217, 239, 0.3)',
              textAlign: 'center',
              marginBottom: 36,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 12 }} className="animate-pulse-glow">
              ⚖️
            </div>
            <strong style={{ display: 'block', fontSize: 16, color: 'var(--cyan)', marginBottom: 6 }}>
              {loadingPhase}
            </strong>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              モノ、テトラ、エンネア、ドライツェーンの審議パイプラインを処理しています...
            </p>
          </div>
        )}

        {/* 結果表示 */}
        {result && !isLoading && (
          <div>
            {/* フェーズ切り替えタブ */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 24 }}>
              <button
                type="button"
                className={`phase-pill ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                全フェーズ表示
              </button>
              <button
                type="button"
                className={`phase-pill ${activeTab === 'phase5' ? 'active' : ''}`}
                onClick={() => setActiveTab('phase5')}
              >
                ⚖️ 最終判定 (Phase 5)
              </button>
              <button
                type="button"
                className={`phase-pill ${activeTab === 'phase1' ? 'active' : ''}`}
                onClick={() => setActiveTab('phase1')}
              >
                📋 質問構造化 (Phase 1)
              </button>
              <button
                type="button"
                className={`phase-pill ${activeTab === 'phase2' ? 'active' : ''}`}
                onClick={() => setActiveTab('phase2')}
              >
                👥 初回判断 (Phase 2)
              </button>
              <button
                type="button"
                className={`phase-pill ${activeTab === 'phase3' ? 'active' : ''}`}
                onClick={() => setActiveTab('phase3')}
              >
                ⚔️ 相互批評 (Phase 3)
              </button>
              <button
                type="button"
                className={`phase-pill ${activeTab === 'phase4' ? 'active' : ''}`}
                onClick={() => setActiveTab('phase4')}
              >
                🔄 再検討 (Phase 4)
              </button>
            </div>

            {/* =========================================================
                Phase 5: ドライツェーンの最終判定 (常に上部に強調表示)
               ========================================================= */}
            {(activeTab === 'all' || activeTab === 'phase5') && (
              <section
                className="character-card character-card-dreizehn"
                style={{
                  marginBottom: 32,
                  boxShadow: '0 0 32px rgba(245, 158, 11, 0.15)',
                  borderWidth: 2,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{CHARACTERS.dreizehn.avatarIcon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#fef3c7' }}>
                          Phase 5: {CHARACTERS.dreizehn.name}の最終判定
                        </span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: 700 }}>
                          調停者
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        多数決に依らず、論理・共感・大局を統合した独立判断
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const badge = getDecisionBadge(result.phase5.decision);
                    return (
                      <div
                        style={{
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                          borderRadius: 8,
                          padding: '6px 14px',
                          fontWeight: 800,
                          fontSize: 13,
                          letterSpacing: '0.05em',
                          boxShadow: `0 0 16px ${badge.bg}`,
                        }}
                      >
                        {badge.label}
                      </div>
                    );
                  })()}
                </div>

                {/* 最終結論 */}
                <div className="quote-bubble quote-dreizehn" style={{ fontSize: 15, fontWeight: 600 }}>
                  {result.phase5.finalConclusion}
                </div>

                {/* 判断理由 */}
                <div style={{ marginBottom: 18 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
                    ■ 判定理由
                  </span>
                  <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 6 }}>
                    {result.phase5.decisionReason}
                  </p>
                </div>

                {/* グリッド: 少数意見・覆す条件・不確実性 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 6 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#fca5a5', marginBottom: 6 }}>
                      ⚠️ 少数意見・残る懸念
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                      {result.phase5.minorityOpinionsAndConcerns.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 6 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#93c5fd', marginBottom: 6 }}>
                      🔄 結論を覆す条件
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                      {result.phase5.overturnConditions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 6 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                      ❓ 不確実性
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                      {result.phase5.uncertainties.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* =========================================================
                Phase 1: 質問の構造化
               ========================================================= */}
            {(activeTab === 'all' || activeTab === 'phase1') && (
              <section
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(80, 217, 239, 0.25)',
                  borderRadius: 10,
                  padding: 22,
                  marginBottom: 28,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>📋</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>
                      Phase 1: 質問の論理構造化
                    </h3>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      目的、選択肢、制約、判断基準を整理
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 6 }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--cyan)', fontWeight: 700, marginBottom: 4 }}>
                      🎯 目的
                    </span>
                    <p style={{ margin: 0, fontSize: 12, color: '#e2e8f0' }}>{result.phase1.goal}</p>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 6 }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--cyan)', fontWeight: 700, marginBottom: 4 }}>
                      ⚖️ 選択肢
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#e2e8f0' }}>
                      {result.phase1.options.map((opt, i) => (
                        <li key={i}>{opt}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 6 }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--cyan)', fontWeight: 700, marginBottom: 4 }}>
                      🚧 制約
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#e2e8f0' }}>
                      {result.phase1.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 6 }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--cyan)', fontWeight: 700, marginBottom: 4 }}>
                      📐 判断基準
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#e2e8f0' }}>
                      {result.phase1.criteria.map((cr, i) => (
                        <li key={i}>{cr}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {result.phase1.assumptions.length > 0 && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px dashed rgba(245, 158, 11, 0.3)', borderRadius: 6, fontSize: 12, color: '#fcd34d' }}>
                    💡 <strong>暫定判断のための仮定：</strong> {result.phase1.assumptions.join(' / ')}
                  </div>
                )}
              </section>
            )}

            {/* =========================================================
                Phase 2: 3人格による独立した初回判断
               ========================================================= */}
            {(activeTab === 'all' || activeTab === 'phase2') && (
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>👥</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                      Phase 2: 3人格による独立初回判断
                    </h3>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      他者の意見を参照せず、各自の哲学に基づき独立して判断
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {/* モノ */}
                  <div className="character-card character-card-mono">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{CHARACTERS.mono.avatarIcon}</span>
                      <strong style={{ fontSize: 15, color: '#fda4af' }}>{CHARACTERS.mono.name}</strong>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e' }}>
                        {CHARACTERS.mono.role}
                      </span>
                    </div>
                    <div className="quote-bubble quote-mono">
                      {result.phase2.mono.initialConclusion}
                    </div>
                    <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 10 }}>
                      <strong>理由:</strong> {result.phase2.mono.reasoning}
                    </p>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      <strong style={{ color: '#fda4af' }}>懸念点:</strong>
                      <ul style={{ margin: '4px 0 8px', paddingLeft: 16 }}>
                        {result.phase2.mono.concerns.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                      <strong style={{ color: '#fda4af' }}>変更条件:</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {result.phase2.mono.changeConditions.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* テトラ */}
                  <div className="character-card character-card-tetra">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{CHARACTERS.tetra.avatarIcon}</span>
                      <strong style={{ fontSize: 15, color: '#7dd3fc' }}>{CHARACTERS.tetra.name}</strong>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(14, 165, 233, 0.2)', color: '#0ea5e9' }}>
                        {CHARACTERS.tetra.role}
                      </span>
                    </div>
                    <div className="quote-bubble quote-tetra">
                      {result.phase2.tetra.initialConclusion}
                    </div>
                    <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 10 }}>
                      <strong>理由:</strong> {result.phase2.tetra.reasoning}
                    </p>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      <strong style={{ color: '#7dd3fc' }}>懸念点:</strong>
                      <ul style={{ margin: '4px 0 8px', paddingLeft: 16 }}>
                        {result.phase2.tetra.concerns.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                      <strong style={{ color: '#7dd3fc' }}>変更条件:</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {result.phase2.tetra.changeConditions.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* エンネア */}
                  <div className="character-card character-card-ennea">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{CHARACTERS.ennea.avatarIcon}</span>
                      <strong style={{ fontSize: 15, color: '#6ee7b7' }}>{CHARACTERS.ennea.name}</strong>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                        {CHARACTERS.ennea.role}
                      </span>
                    </div>
                    <div className="quote-bubble quote-ennea">
                      {result.phase2.ennea.initialConclusion}
                    </div>
                    <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 10 }}>
                      <strong>理由:</strong> {result.phase2.ennea.reasoning}
                    </p>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      <strong style={{ color: '#6ee7b7' }}>懸念点:</strong>
                      <ul style={{ margin: '4px 0 8px', paddingLeft: 16 }}>
                        {result.phase2.ennea.concerns.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                      <strong style={{ color: '#6ee7b7' }}>変更条件:</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {result.phase2.ennea.changeConditions.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* =========================================================
                Phase 3: 相互批評
               ========================================================= */}
            {(activeTab === 'all' || activeTab === 'phase3') && (
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>⚔️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                      Phase 3: 相互批評
                    </h3>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      初回判断を共有し、合意点・対立点・根拠の強弱を整理
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {/* モノの批評 */}
                  <div className="character-card character-card-mono">
                    <strong style={{ fontSize: 14, color: '#fda4af', display: 'block', marginBottom: 8 }}>
                      🌹 モノの視座からの批評
                    </strong>
                    <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                      <p style={{ margin: '0 0 6px' }}><strong>合意点:</strong> {result.phase3.mono.agreements.join(', ')}</p>
                      <p style={{ margin: '0 0 6px' }}><strong>対立点:</strong> {result.phase3.mono.disagreements.join(', ')}</p>
                      <p style={{ margin: '0 0 6px' }}><strong>根拠評価:</strong> {result.phase3.mono.evidenceEvaluation}</p>
                      <p style={{ margin: '0' }}><strong>有力な反論:</strong> {result.phase3.mono.counterArguments.join(', ')}</p>
                    </div>
                  </div>

                  {/* テトラの批評 */}
                  <div className="character-card character-card-tetra">
                    <strong style={{ fontSize: 14, color: '#7dd3fc', display: 'block', marginBottom: 8 }}>
                      ⚙️ テトラの客観的批評
                    </strong>
                    <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                      <p style={{ margin: '0 0 6px' }}><strong>合意点:</strong> {result.phase3.tetra.agreements.join(', ')}</p>
                      <p style={{ margin: '0 0 6px' }}><strong>対立点:</strong> {result.phase3.tetra.disagreements.join(', ')}</p>
                      <p style={{ margin: '0 0 6px' }}><strong>根拠評価:</strong> {result.phase3.tetra.evidenceEvaluation}</p>
                      <p style={{ margin: '0' }}><strong>有力な反論:</strong> {result.phase3.tetra.counterArguments.join(', ')}</p>
                    </div>
                  </div>

                  {/* エンネアの批評 */}
                  <div className="character-card character-card-ennea">
                    <strong style={{ fontSize: 14, color: '#6ee7b7', display: 'block', marginBottom: 8 }}>
                      🌱 エンネアの共感批評
                    </strong>
                    <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                      <p style={{ margin: '0 0 6px' }}><strong>合意点:</strong> {result.phase3.ennea.agreements.join(', ')}</p>
                      <p style={{ margin: '0 0 6px' }}><strong>対立点:</strong> {result.phase3.ennea.disagreements.join(', ')}</p>
                      <p style={{ margin: '0 0 6px' }}><strong>根拠評価:</strong> {result.phase3.ennea.evidenceEvaluation}</p>
                      <p style={{ margin: '0' }}><strong>有力な反論:</strong> {result.phase3.ennea.counterArguments.join(', ')}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* =========================================================
                Phase 4: 再検討
               ========================================================= */}
            {(activeTab === 'all' || activeTab === 'phase4') && (
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>🔄</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                      Phase 4: 再検討
                    </h3>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      他者の批評を受け止め、「維持」「変更」「保留」を選択
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {/* モノ */}
                  <div className="character-card character-card-mono">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: '#fda4af' }}>🌹 {CHARACTERS.mono.name}</span>
                      {getActionBadge(result.phase4.mono.action)}
                    </div>
                    <div className="quote-bubble quote-mono" style={{ fontSize: 13 }}>
                      {result.phase4.mono.revisedConclusion}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                      <strong>再検討理由:</strong> {result.phase4.mono.revisionReason}
                    </p>
                  </div>

                  {/* テトラ */}
                  <div className="character-card character-card-tetra">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: '#7dd3fc' }}>⚙️ {CHARACTERS.tetra.name}</span>
                      {getActionBadge(result.phase4.tetra.action)}
                    </div>
                    <div className="quote-bubble quote-tetra" style={{ fontSize: 13 }}>
                      {result.phase4.tetra.revisedConclusion}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                      <strong>再検討理由:</strong> {result.phase4.tetra.revisionReason}
                    </p>
                  </div>

                  {/* エンネア */}
                  <div className="character-card character-card-ennea">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: '#6ee7b7' }}>🌱 {CHARACTERS.ennea.name}</span>
                      {getActionBadge(result.phase4.ennea.action)}
                    </div>
                    <div className="quote-bubble quote-ennea" style={{ fontSize: 13 }}>
                      {result.phase4.ennea.revisedConclusion}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                      <strong>再検討理由:</strong> {result.phase4.ennea.revisionReason}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
