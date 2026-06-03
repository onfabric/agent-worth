import { defineRootCommand } from '@parshjs/core';
import { z } from 'zod';

export const command = defineRootCommand({
  options: {
    verbose: {
      schema: z.boolean().optional(),
      forwardToChildren: true,
      description: 'Print extra diagnostic output.',
    },
  },
});
