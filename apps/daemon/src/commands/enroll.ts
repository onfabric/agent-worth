import { defineCommand } from "@parshjs/core";
import { z } from "zod";
import { enrollClient } from "../runtime/enroll";

export const command = defineCommand("enroll", {
  description: "Bind this daemon client to an employee using a service enrollment token.",
  options: {
    server: {
      schema: z.string().url(),
      description: "Agent Worth API base URL."
    },
    token: {
      schema: z.string().min(1),
      description: "Enrollment token issued by the Agent Worth service."
    }
  },
  handler: async ({ options, context, print }) => {
    const result = await enrollClient(context, options);
    print.success(`enrolled ${result.employee.displayName} as client ${result.clientId}`);
  }
});

