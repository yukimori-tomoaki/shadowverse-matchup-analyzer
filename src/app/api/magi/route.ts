import { NextRequest, NextResponse } from 'next/server';
import { executeMagiPipeline } from '@/lib/magi';
import { hasOpenAiKey } from '@/lib/openai';

export const maxDuration = 60; // Vercelなどのタイムアウト設定 (最大60秒)

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'リクエストの形式が不正です。正しいJSON形式で送信してください。' },
        { status: 400 }
      );
    }
    const question = typeof body?.question === 'string' ? body.question.trim() : '';

    if (!question) {
      return NextResponse.json(
        { error: '質問内容が入力されていません。' },
        { status: 400 }
      );
    }

    // サーバー側の入力文字数制限（最大1000文字）
    if (question.length > 1000) {
      return NextResponse.json(
        { error: '質問内容は1000文字以内で入力してください。' },
        { status: 400 }
      );
    }

    // パイプライン実行（キーがない場合は自動的に安全なモック結果を返却）
    const result = await executeMagiPipeline(question);

    return NextResponse.json({
      success: true,
      hasApiKey: hasOpenAiKey(),
      result,
    });
  } catch (error: unknown) {
    console.error('API /api/magi handler error:', error);
    return NextResponse.json(
      { error: '審議処理中にエラーが発生しました。時間を置いて再度お試しください。' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    hasApiKey: hasOpenAiKey(),
    version: '0.1.0',
  });
}
