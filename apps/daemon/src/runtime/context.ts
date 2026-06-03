import { fileURLToPath } from 'node:url';
import { ConfigStore } from './config';
import { SyncState } from './state';

export type DaemonContext = {
  config: ConfigStore;
  state: SyncState;
  scheduledScriptPath: string;
};

export function createDaemonContext(): DaemonContext {
  const config = new ConfigStore();
  return {
    config,
    state: new SyncState(config.stateDbPath),
    scheduledScriptPath: fileURLToPath(new URL('../scheduled.ts', import.meta.url)),
  };
}
