import { cosmiconfig } from 'cosmiconfig';
import { ReviewConfig, ReviewConfigSchema } from './schema.js';
import { DEFAULT_CONFIG } from './defaults.js';

const explorer = cosmiconfig('review-council');

export async function loadConfig(override?: Partial<ReviewConfig>): Promise<ReviewConfig> {
  try {
    const result = await explorer.search();
    const fileConfig = result?.config || {};

    const merged = {
      ...DEFAULT_CONFIG,
      ...fileConfig,
      ...override,
    };

    // Validate with Zod
    const validated = ReviewConfigSchema.parse(merged);
    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid configuration: ${error.message}`);
    }
    throw error;
  }
}

export async function getConfig(cliOptions?: {
  models?: string[];
  timeout?: number;
  verbose?: boolean;
}): Promise<ReviewConfig> {
  const override: Partial<ReviewConfig> = {};

  if (cliOptions?.models) {
    // Parse model names and map to configs
    override.models = cliOptions.models.map(name => {
      const lower = name.toLowerCase();
      if (lower.includes('claude')) {
        return {
          provider: 'anthropic' as const,
          model: 'claude-sonnet-4-5-20250929',
          apiKey: process.env.ANTHROPIC_API_KEY,
          temperature: 0.3,
          maxTokens: 4000,
        };
      } else if (lower.includes('gpt') || lower.includes('openai')) {
        return {
          provider: 'openai' as const,
          model: 'gpt-4o',
          apiKey: process.env.OPENAI_API_KEY,
          temperature: 0.3,
          maxTokens: 4000,
        };
      } else if (lower.includes('gemini') || lower.includes('google')) {
        return {
          provider: 'google' as const,
          model: 'gemini-2.0-flash-exp',
          apiKey: process.env.GOOGLE_API_KEY,
          temperature: 0.3,
          maxTokens: 4000,
        };
      }
      throw new Error(`Unknown model: ${name}`);
    });
  }

  if (cliOptions?.timeout) {
    override.timeout = cliOptions.timeout;
  }

  if (cliOptions?.verbose !== undefined) {
    override.includeFixSuggestions = cliOptions.verbose;
  }

  return loadConfig(override);
}
