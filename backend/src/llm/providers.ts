import { env } from '../config/env.js';
import { LlmTimeoutError } from './errors.js';
import { buildSystemPrompt, buildUserPrompt, TRANSCRIPT_GUIDANCE } from './prompt.js';
import { suggestionSchema, type LlmProvider, type SuggestInput, type Suggestion } from './types.js';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new LlmTimeoutError()), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('Model did not return JSON');
  return JSON.parse(candidate.slice(start, end + 1));
}

function parseSuggestion(text: string): Suggestion {
  const parsed = suggestionSchema.safeParse(extractJson(text));
  if (!parsed.success) {
    throw new Error(`Model returned an invalid suggestion: ${parsed.error.issues[0]?.message ?? 'unknown shape'}`);
  }
  return parsed.data;
}

async function postJson(url: string, body: unknown, headers: Record<string, string>, timeoutMs: number) {
  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
    timeoutMs,
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`LLM request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
  return response;
}

class ChatCompletionsProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly extraHeaders: Record<string, string>;

  constructor(name: string, endpoint: string, model: string, apiKey: string, extraHeaders: Record<string, string> = {}) {
    this.name = name;
    this.endpoint = endpoint;
    this.model = model;
    this.apiKey = apiKey;
    this.extraHeaders = extraHeaders;
  }

  async generate(input: SuggestInput): Promise<Suggestion> {
    const response = await postJson(
      this.endpoint,
      {
        model: this.model,
        temperature: 0.4,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${buildSystemPrompt()}\n\n${TRANSCRIPT_GUIDANCE}` },
          { role: 'user', content: buildUserPrompt(input) },
        ],
      },
      { Authorization: `Bearer ${this.apiKey}`, ...this.extraHeaders },
      env.LLM_TIMEOUT_MS,
    );
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('Model returned an empty response');
    return parseSuggestion(content);
  }
}

class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly apiKey: string;
  private readonly models: string[];

  constructor(models: string[], apiKey: string) {
    this.models = models;
    this.apiKey = apiKey;
  }

  get model(): string {
    return this.models[0];
  }

  async generate(input: SuggestInput): Promise<Suggestion> {
    for (const model of this.models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await this.generateWithModel(model, input);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes('503') && attempt === 0) {
            continue;
          }
          break;
        }
      }
    }
    const demo = DEMO_REPLIES[input.stageId] ?? DEMO_REPLIES.opening;
    return {
      ...demo,
      suggestedResponse: input.prospectStatement
        ? `${demo.suggestedResponse} I have your words here: "${input.prospectStatement.slice(0, 160)}".`
        : demo.suggestedResponse,
      caution: 'All models unavailable; using demo suggestion.',
    };
  }

  private async generateWithModel(model: string, input: SuggestInput): Promise<Suggestion> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent`;
    const response = await postJson(
      url,
      {
        systemInstruction: { parts: [{ text: `${buildSystemPrompt()}\n\n${TRANSCRIPT_GUIDANCE}` }] },
        contents: [{ role: 'user', parts: [{ text: buildUserPrompt(input) }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json', maxOutputTokens: 700 },
      },
      { 'X-goog-api-key': this.apiKey },
      env.LLM_TIMEOUT_MS,
    );
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
    if (!text) throw new Error('Model returned an empty response');
    return parseSuggestion(text);
  }
}

const DEMO_REPLIES: Record<string, { suggestedResponse: string; reason: string; followUpQuestion: string }> = {
  opening: {
    suggestedResponse:
      'Hello, am I speaking with the person who looks after growth at the company? This is [name] from Meridian Growth Partners. Is this a fair moment to speak?',
    reason:
      'The opening has one job: reach the right person and ask for a fair moment. The suggestion avoids pitching before the prospect knows who is calling.',
    followUpQuestion: 'Is now a fair moment, or should I call back at a better time?',
  },
  purpose: {
    suggestedResponse:
      'We study a company, its industry and its competitors, and prepare a short growth report with two or three practical ideas. I called to ask whether a report like that would be useful to you.',
    reason:
      'The prospect needs a purpose they can repeat to a colleague. The suggestion names the work and the artefact in one sentence, without a full pitch.',
    followUpQuestion: 'When you hear "growth report", what would you expect it to cover?',
  },
  permission: {
    suggestedResponse:
      'That is fair. Would a short conversation later today or tomorrow morning suit you better? I can also send the one-page summary first on WhatsApp.',
    reason:
      'A clear time or a clear no is better than talking on without permission. Offering a channel respects the prospect\'s answer.',
    followUpQuestion: 'Which is easier for you: a call after two, or the summary on WhatsApp first?',
  },
  their_business: {
    suggestedResponse:
      'Before I say anything about us, I would like to understand your side. What does the company make or sell today, and which part of the business are you responsible for?',
    reason:
      'People talk about their own work. Asking before pitching gives the caller real material and corrects wrong assumptions early.',
    followUpQuestion: 'What has changed in the business in the last year that matters most to you?',
  },
  their_need: {
    suggestedResponse:
      'So what I am hearing is that the priority is [repeat the prospect\'s words]. Is that close, or would you put it differently?',
    reason:
      'This stage is the one place to capture the prospect\'s own words. Repeating them back checks accuracy before anything is written down.',
    followUpQuestion: 'What is getting in the way of that today?',
  },
  objection: {
    suggestedResponse:
      'I understand. You already have someone doing this work. May I ask what they cover well, and where you feel the gap is, if any?',
    reason:
      'An objection is a reason, not a rejection. Understanding the existing arrangement is more useful than arguing with it.',
    followUpQuestion: 'If you had one extra piece of analysis this quarter, what would you want it to answer?',
  },
  next_step: {
    suggestedResponse:
      'Let us agree one next step. I can send the report on WhatsApp today, and we can speak for fifteen minutes on Thursday after three. Does that work, or would another time suit you better?',
    reason:
      'A next step needs one named action and a time or channel. A time chosen by the prospect is worth more than a time proposed by the caller.',
    followUpQuestion: 'Would Thursday after three work, or is another time easier?',
  },
  close: {
    suggestedResponse:
      'Thank you for your time. I will send that on WhatsApp today and call you on Thursday after three as agreed. I have noted your words about [priority] so the next call starts from there.',
    reason:
      'The close records the outcome, the next step and the prospect\'s own words so the next call is built on the record rather than memory.',
    followUpQuestion: 'Is there anything you would like me to include in the note before I send it?',
  },
};

class DemoProvider implements LlmProvider {
  readonly name = 'demo';
  readonly model = 'clearly-labelled-demo';

  async generate(input: SuggestInput): Promise<Suggestion> {
    const base = DEMO_REPLIES[input.stageId] ?? DEMO_REPLIES.purpose;
    const caution = input.prospectStatement?.trim()
      ? 'Demo suggestion generated without a real model. Review every word before you speak.'
      : 'No prospect statement was recorded. This is a demo suggestion, not a real model response.';
    const prospect = input.prospectStatement?.trim();
    return {
      ...base,
      suggestedResponse: prospect
        ? `${base.suggestedResponse} I have your words here: "${prospect.slice(0, 160)}".`
        : base.suggestedResponse,
      caution,
    };
  }
}

export function createLlmProvider(): LlmProvider {
  const { LLM_PROVIDER, LLM_API_KEY, LLM_MODEL } = env;
  if (LLM_PROVIDER === 'demo' || !LLM_API_KEY) {
    return new DemoProvider();
  }
  switch (LLM_PROVIDER) {
    case 'gemini':
      return new GeminiProvider([LLM_MODEL ?? 'gemini-3.8-flash', 'gemini-2.5-flash'], LLM_API_KEY);
    case 'mistral':
      return new ChatCompletionsProvider(
        'mistral',
        'https://api.mistral.ai/v1/chat/completions',
        LLM_MODEL ?? 'mistral-small-latest',
        LLM_API_KEY,
      );
    case 'cerebras':
      return new ChatCompletionsProvider(
        'cerebras',
        'https://api.cerebras.ai/v1/chat/completions',
        LLM_MODEL ?? 'llama3.1-8b',
        LLM_API_KEY,
      );
    case 'openai':
      return new ChatCompletionsProvider(
        'openai',
        'https://api.openai.com/v1/chat/completions',
        LLM_MODEL ?? 'gpt-4o-mini',
        LLM_API_KEY,
      );
    default:
      return new DemoProvider();
  }
}

export const llmProvider = createLlmProvider();
