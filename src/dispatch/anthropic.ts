import Anthropic from '@anthropic-ai/sdk';
import { ReviewAdapter, ReviewRequest, ReviewResponse } from './adapter.js';

export class AnthropicAdapter implements ReviewAdapter {
  getName(): string {
    return 'anthropic';
  }

  async review(request: ReviewRequest): Promise<ReviewResponse> {
    const startTime = Date.now();
    const apiKey = request.model.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        provider: 'anthropic',
        model: request.model.model,
        rawResponse: '',
        success: false,
        error: 'ANTHROPIC_API_KEY not found',
        durationMs: 0,
      };
    }

    const client = new Anthropic({ apiKey });

    try {
      const response = await Promise.race([
        client.messages.create({
          model: request.model.model,
          max_tokens: request.model.maxTokens,
          temperature: request.model.temperature,
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
          tools: [
            {
              name: 'report_findings',
              description: 'Report code review findings',
              input_schema: {
                type: 'object',
                properties: {
                  findings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        file: { type: 'string' },
                        line: { type: 'number' },
                        severity: {
                          type: 'string',
                          enum: ['info', 'low', 'medium', 'high', 'critical'],
                        },
                        category: { type: 'string' },
                        message: { type: 'string' },
                        suggestion: { type: 'string' },
                      },
                      required: ['file', 'line', 'severity', 'category', 'message', 'suggestion'],
                    },
                  },
                },
                required: ['findings'],
              },
            },
          ],
          tool_choice: { type: 'tool', name: 'report_findings' },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), request.timeout * 1000)
        ),
      ]);

      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No tool use in response');
      }

      const findings = (toolUse.input as any).findings || [];

      return {
        provider: 'anthropic',
        model: request.model.model,
        rawResponse: JSON.stringify(findings),
        success: true,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        provider: 'anthropic',
        model: request.model.model,
        rawResponse: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
