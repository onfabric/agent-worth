import { defineCommand } from "@parshjs/core";

const CRON_TITLE = "agent-worth-sync";

export const command = defineCommand("uninstall-cron", {
  description: "Remove the Agent Worth OS cron job.",
  options: {},
  handler: async ({ print }) => {
    await Bun.cron.remove(CRON_TITLE);
    print.success(`removed ${CRON_TITLE}`);
  }
});

