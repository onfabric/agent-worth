import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export type DaemonConfig = {
  clientId: string;
  serverUrl?: string;
  apiToken?: string;
  employeeId?: string;
  employeeDisplayName?: string;
};

const CONFIG_DIR = join(homedir(), ".agent-worth");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const STATE_DB_PATH = join(CONFIG_DIR, "state.sqlite");

export class ConfigStore {
  readonly dir = CONFIG_DIR;
  readonly configPath = CONFIG_PATH;
  readonly stateDbPath = STATE_DB_PATH;

  async read(): Promise<DaemonConfig> {
    await mkdir(this.dir, { recursive: true });
    const file = Bun.file(this.configPath);
    if (!(await file.exists())) {
      const initial = { clientId: crypto.randomUUID() };
      await this.write(initial);
      return initial;
    }

    return (await file.json()) as DaemonConfig;
  }

  async write(config: DaemonConfig): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await Bun.write(this.configPath, `${JSON.stringify(config, null, 2)}\n`);
  }
}

