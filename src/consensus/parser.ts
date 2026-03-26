import { ReviewResponse } from '../dispatch/adapter.js';
import { ModelReview, FindingSchema } from './types.js';
import { z } from 'zod';

export function parseReviewResponse(response: ReviewResponse): ModelReview {
  if (!response.success) {
    return {
      provider: response.provider,
      model: response.model,
      findings: [],
      success: false,
      error: response.error,
      durationMs: response.durationMs,
    };
  }

  try {
    const parsed = JSON.parse(response.rawResponse);
    const findings = Array.isArray(parsed) ? parsed : [];

    // Validate each finding
    const validFindings = findings
      .map((f, idx) => {
        try {
          return FindingSchema.parse(f);
        } catch (error) {
          console.warn(
            `Invalid finding from ${response.provider}/${response.model} at index ${idx}:`,
            error instanceof z.ZodError ? error.errors : error
          );
          return null;
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      provider: response.provider,
      model: response.model,
      findings: validFindings,
      success: true,
      durationMs: response.durationMs,
    };
  } catch (error) {
    return {
      provider: response.provider,
      model: response.model,
      findings: [],
      success: false,
      error: `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      durationMs: response.durationMs,
    };
  }
}

export function parseAllReviews(responses: ReviewResponse[]): ModelReview[] {
  return responses.map(parseReviewResponse);
}
