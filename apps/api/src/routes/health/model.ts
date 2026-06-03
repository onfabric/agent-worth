import { t } from 'elysia';

export const GetHealthResponseSchema = t.Object({
  ok: t.Literal(true),
});
