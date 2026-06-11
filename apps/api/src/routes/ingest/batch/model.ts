import { t } from 'elysia';

export const IngestBatchBodySchema = t.Array(t.Any());

export const IngestBatchResponseSchema = t.Object({
  accepted: t.Integer(),
  createdVersions: t.Integer(),
  skippedUnchanged: t.Integer(),
});
