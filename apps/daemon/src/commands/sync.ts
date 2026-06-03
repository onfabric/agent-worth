import { defineCommand } from '@parshjs/core';
import { z } from 'zod';
import { syncOnce } from '../runtime/sync';

export const command = defineCommand('sync', {
  description: 'Sync changed local AI-agent transcripts once.',
  options: {
    dryRun: {
      schema: z.boolean().default(false),
      aliases: ['dry-run'],
      description: 'Scan and report changes without sending them to the API.',
    },
    force: {
      schema: z.boolean().default(false),
      description: 'Send every scanned transcript, even if local state says it is unchanged.',
    },
  },
  handler: async ({ options, context, print }) => {
    const result = await syncOnce(context, { dryRun: options.dryRun, force: options.force });
    print.info(`scanned ${result.scanned} files`);
    print.info(`changed ${result.changed} files`);
    if (options.dryRun) {
      print.success('dry run complete');
      return;
    }
    print.success(`synced ${result.synced} files`);
  },
});
