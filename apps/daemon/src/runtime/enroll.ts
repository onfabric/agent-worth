import type { DaemonContext } from "./context";
import { sha256Hex } from "./hash";

export async function enrollClient(
  context: DaemonContext,
  input: { server: string; token: string }
): Promise<{ employee: { id: string; displayName: string }; clientId: string; apiToken: string }> {
  const config = await context.config.read();
  const hostnameHash = await sha256Hex(Bun.env.HOSTNAME ?? "unknown-host");

  const response = await fetch(new URL("/v1/enroll", input.server), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      enrollmentToken: input.token,
      clientId: config.clientId,
      hostnameHash
    })
  });

  if (!response.ok) {
    throw new Error(`enrollment failed: ${response.status} ${await response.text()}`);
  }

  const result = (await response.json()) as {
    employee: { id: string; displayName: string };
    clientId: string;
    apiToken: string;
  };

  await context.config.write({
    ...config,
    serverUrl: input.server,
    apiToken: result.apiToken,
    employeeId: result.employee.id,
    employeeDisplayName: result.employee.displayName
  });

  return result;
}

