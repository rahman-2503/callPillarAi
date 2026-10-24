export class LlmTimeoutError extends Error {
  constructor(message = 'The language model took too long to respond') {
    super(message);
    this.name = 'LlmTimeoutError';
  }
}

export class LlmUnavailableError extends Error {
  constructor(message = 'The language model is not configured on this server') {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}
