import { Service } from '#services/service.ts';

export class HealthService extends Service {
  async check(): Promise<{ ok: true }> {
    this.logger.info('handling health check');
    return { ok: true };
  }
}
