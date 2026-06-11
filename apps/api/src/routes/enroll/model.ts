import { t } from 'elysia';

export const EnrollBodySchema = t.Object({
  enrollmentToken: t.String(),
  clientId: t.String(),
  hostnameHash: t.Optional(t.String()),
});

export const EmployeeSchema = t.Object({
  id: t.String(),
  displayName: t.String(),
  email: t.Optional(t.String()),
  team: t.Optional(t.String()),
});

export const EnrollResponseSchema = t.Object({
  employee: EmployeeSchema,
  clientId: t.String(),
  apiToken: t.String(),
});
