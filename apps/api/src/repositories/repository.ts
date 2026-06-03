import { createLogger } from '#lib/logger.ts';

export abstract class Repository {
  protected readonly logger = createLogger(this.constructor.name);
}
