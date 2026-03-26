import { ModelConfig } from '../config/schema.js';
import { ReviewAdapter, ReviewRequest, ReviewResponse } from './adapter.js';
import { AnthropicAdapter } from './anthropic.js';
import { OpenAIAdapter } from './openai.js';
import { GoogleAdapter } from './google.js';
import { OpenAICompatAdapter } from './openai-compat.js';

const adapters: Record<string, ReviewAdapter> = {
  anthropic: new AnthropicAdapter(),
  openai: new OpenAIAdapter(),
  google: new GoogleAdapter(),
  'openai-compat': new OpenAICompatAdapter(),
};

export async function runReviews(
  prompt: string,
  models: ModelConfig[],
  timeout: number,
  maxConcurrent: number
): Promise<ReviewResponse[]> {
  const requests: ReviewRequest[] = models.map(model => ({
    prompt,
    model,
    timeout,
  }));

  // Run reviews with concurrency limit
  const results: ReviewResponse[] = [];
  for (let i = 0; i < requests.length; i += maxConcurrent) {
    const batch = requests.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(req => {
        const adapter = adapters[req.model.provider];
        if (!adapter) {
          return Promise.resolve({
            provider: req.model.provider,
            model: req.model.model,
            rawResponse: '',
            success: false,
            error: `Unknown provider: ${req.model.provider}`,
            durationMs: 0,
          });
        }
        return adapter.review(req);
      })
    );
    results.push(...batchResults);
  }

  return results;
}

export function getAdapter(provider: string): ReviewAdapter | null {
  return adapters[provider] || null;
}
