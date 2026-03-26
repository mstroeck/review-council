import OpenAI from 'openai';
import { ReviewAdapter, ReviewRequest, ReviewResponse } from './adapter.js';

export class OpenAICompatAdapter implements ReviewAdapter {
  getName(): string {
    return 'openai-compat';
  }

  async review(request: ReviewRequest): Promise<ReviewResponse> {
    const startTime = Date.now();
    const apiKey = request.model.apiKey;
    const baseURL = request.model.baseUrl;

    if (!apiKey) {
      return {
        provider: 'openai-compat',
        model: request.model.model,
        rawResponse: '',
        success: false,
        error: 'API key not provided',
        durationMs: 0,
      };
    }

    if (!baseURL) {
      return {
        provider: 'openai-compat',
        model: request.model.model,
        rawResponse: '',
        success: false,
        error: 'Base URL not provided',
        durationMs: 0,
      };
    }

    const client = new OpenAI({ apiKey, baseURL });

    try {
      const response = await Promise.race([
        client.chat.completions.create({
          model: request.model.model,
          temperature: request.model.temperature,
          max_tokens: request.model.maxTokens,
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
          response_format: { type: 'json_object' },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), request.timeout * 1000)
        ),
      ]);

      const content = response.choices[0]?.message?.content || '[]';

      let parsed;
      try {
        parsed = JSON.parse(content);
        if (parsed.findings && Array.isArray(parsed.findings)) {
          parsed = parsed.findings;
        }
      } catch {
        parsed = [];
      }

      return {
        provider: 'openai-compat',
        model: request.model.model,
        rawResponse: JSON.stringify(parsed),
        success: true,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        provider: 'openai-compat',
        model: request.model.model,
        rawResponse: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
