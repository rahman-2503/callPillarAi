import { aiService } from '../src/services/aiService.js';

const result = await aiService.suggest({
  stageId: 'objection',
  stagePurpose: 'Hear the reason for a no and understand it.',
  prospectStatement: 'We already have an agency doing this for us.',
  callNotes: 'Prospect said the agency handles their marketing.',
});

console.log(
  JSON.stringify(
    {
      provider: result.provider,
      model: result.model,
      demo: result.demo,
      suggestedResponse: result.suggestedResponse,
      reason: result.reason,
      followUpQuestion: result.followUpQuestion,
      caution: result.caution,
    },
    null,
    2,
  ),
);
