import { createApp } from './app.js';
import { env } from './config/env.js';
import { callsService } from './services/callsService.js';

const app = createApp();

app.listen(env.PORT, () => {
  const meta = callsService.meta();
  console.log(`CallPilot API listening on http://localhost:${env.PORT}`);
  console.log(`Database driver: ${meta.database}`);
  console.log(`LLM provider: ${meta.llmProvider}${meta.llmConfigured ? '' : ' (no key; demo only where allowed)'}`);
});
