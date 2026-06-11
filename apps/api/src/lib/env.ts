const DEFAULT_MAX_REQUEST_BODY_SIZE = 512 * 1024 * 1024;

export function configuredMaxRequestBodySize() {
  const parsed = Number(Bun.env.AGENT_WORTH_MAX_REQUEST_BODY_SIZE ?? DEFAULT_MAX_REQUEST_BODY_SIZE);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_REQUEST_BODY_SIZE;
}
