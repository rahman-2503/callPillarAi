import { env } from '../config/env.js';
import { LlmUnavailableError, LlmTimeoutError } from '../llm/errors.js';
import { llmProvider } from '../llm/providers.js';
import type { SuggestInput, SuggestionResult } from '../llm/types.js';

export { LlmUnavailableError, LlmTimeoutError };

export const aiService = {
  async suggest(input: SuggestInput): Promise<SuggestionResult> {
    if (env.LLM_PROVIDER !== 'demo' && !env.hasLlmKey) {
      throw new LlmUnavailableError('The language model is not configured on this server');
    }
    const suggestion = await llmProvider.generate(input);
    return {
      ...suggestion,
      provider: llmProvider.name,
      model: llmProvider.model,
      demo: llmProvider.name === 'demo',
    };
  },
};
