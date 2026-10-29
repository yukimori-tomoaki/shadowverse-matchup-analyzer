import OpenAI from 'openai';

// サーバーサイド専用のクライアント初期化
let openAiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  if (!openAiInstance) {
    const timeout = parseInt(process.env.OPENAI_TIMEOUT_MS || '60000', 10);
    openAiInstance = new OpenAI({
      apiKey,
      timeout: isNaN(timeout) ? 60000 : timeout,
    });
  }

  return openAiInstance;
}

export function hasOpenAiKey(): boolean {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return Boolean(apiKey && apiKey.length > 5);
}

export function getModelName(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
}

export function getMaxTokens(): number {
  const tokens = parseInt(process.env.OPENAI_MAX_TOKENS || '1500', 10);
  return isNaN(tokens) ? 1500 : tokens;
}
