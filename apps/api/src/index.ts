import { createApp } from '#app.ts';
import { createLogger } from '#lib/logger.ts';

const port = Number(Bun.env.PORT ?? 3001);
const logger = createLogger('agent-worth');

createApp().listen(port, ({ hostname, port: actualPort }) => {
  logger.info(`api listening at http://${hostname}:${actualPort}`);
});
