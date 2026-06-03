import { defineCommand } from '@parshjs/core';
import { z } from 'zod';

const DEFAULT_SCHEDULE = '*/5 * * * *';
const CRON_TITLE = 'agent-worth-sync';

export const command = defineCommand('install-cron', {
  description: 'Install or replace the reboot-persistent OS cron job.',
  options: {
    schedule: {
      schema: z.string().default(DEFAULT_SCHEDULE),
      description: 'Five-field cron expression.',
    },
  },
  handler: async ({ options, context, print }) => {
    await Bun.cron(context.scheduledScriptPath, options.schedule, CRON_TITLE);
    print.success(`installed ${CRON_TITLE} (${options.schedule})`);
    print.dim(context.scheduledScriptPath);
  },
});
