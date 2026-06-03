import { defineCommand } from '@parshjs/core';

export const command = defineCommand('status', {
  description: 'Show enrollment and local sync-state status.',
  options: {},
  handler: async ({ context, print }) => {
    const config = await context.config.read();
    const stats = context.state.stats();

    print.info(`client id: ${config.clientId}`);
    print.info(`server: ${config.serverUrl ?? 'not enrolled'}`);
    print.info(`employee: ${config.employeeId ?? 'not enrolled'}`);
    print.info(`tracked files: ${stats.trackedFiles}`);
    print.info(`last sync: ${stats.lastSyncedAt ?? 'never'}`);
  },
});
