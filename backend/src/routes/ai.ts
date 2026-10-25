import { Router } from 'express';
import { suggestSchema } from '../schemas/call.js';
import { aiService, LlmTimeoutError, LlmUnavailableError } from '../services/aiService.js';
import { ApiError } from '../middleware/errorHandler.js';

export const aiRouter = Router();

aiRouter.post('/suggest', async (req, res, next) => {
  try {
    const body = suggestSchema.parse(req.body);
    if (!body.prospectStatement && !body.callNotes) {
      throw new ApiError(
        422,
        'INSUFFICIENT_CONTEXT',
        'Add the prospect\'s words or a call note before asking the copilot for a suggestion',
      );
    }
    const suggestion = await aiService.suggest(body);
    res.status(200).json({ data: suggestion });
  } catch (error) {
    if (error instanceof LlmTimeoutError) {
      next(new ApiError(504, 'LLM_TIMEOUT', 'The copilot took too long to respond. Please retry.'));
      return;
    }
    if (error instanceof LlmUnavailableError) {
      next(new ApiError(503, 'LLM_UNAVAILABLE', 'The copilot is not configured on this server.'));
      return;
    }
    next(error);
  }
});
