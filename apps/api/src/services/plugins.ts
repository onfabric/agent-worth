import { Elysia } from 'elysia';
import { createLogger } from '#lib/logger.ts';
import {
  type AgentWorthRepositoryContract,
  createMemoryRepository,
} from '#repositories/agent-worth.repository.ts';
import { CostsService } from '#services/costs.service.ts';
import { EmployeesService } from '#services/employees.service.ts';
import { EnrollmentService } from '#services/enrollment.service.ts';
import { HealthService } from '#services/health.service.ts';
import { IngestService } from '#services/ingest.service.ts';
import { SessionsService } from '#services/sessions.service.ts';

export function loggerPlugin(name: string) {
  const logger = createLogger(name);
  return new Elysia({ name: `logger.${name}` }).derive({ as: 'scoped' }, () => ({ logger }));
}

export function createServicePlugins(
  repository: AgentWorthRepositoryContract = createMemoryRepository(),
) {
  const healthService = new HealthService();
  const enrollmentService = new EnrollmentService(repository);
  const ingestService = new IngestService(repository);
  const sessionsService = new SessionsService(repository);
  const costsService = new CostsService(repository);
  const employeesService = new EmployeesService(repository);

  return {
    loggerPlugin,
    HealthServicePlugin: new Elysia({ name: 'service.health' }).decorate(
      'healthService',
      healthService,
    ),
    EnrollmentServicePlugin: new Elysia({ name: 'service.enrollment' }).decorate(
      'enrollmentService',
      enrollmentService,
    ),
    IngestServicePlugin: new Elysia({ name: 'service.ingest' }).decorate(
      'ingestService',
      ingestService,
    ),
    SessionsServicePlugin: new Elysia({ name: 'service.sessions' }).decorate(
      'sessionsService',
      sessionsService,
    ),
    CostsServicePlugin: new Elysia({ name: 'service.costs' }).decorate(
      'costsService',
      costsService,
    ),
    EmployeesServicePlugin: new Elysia({ name: 'service.employees' }).decorate(
      'employeesService',
      employeesService,
    ),
  };
}

export type ServicePlugins = ReturnType<typeof createServicePlugins>;
