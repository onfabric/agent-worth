import { defineCommand } from "@parshjs/core";
import { z } from "zod";
import { syncOnce } from "../runtime/sync";

export const command = defineCommand("sync", {
  description: "Sync changed local AI-agent transcripts once.",
  options: {
    dryRun: {
      schema: z.boolean().default(false),
      description: "Scan and report changes without sending them to the API."
    }
  },
  handler: async ({ options, context, print }) => {
    const result = await syncOnce(context, { dryRun: options.dryRun });
    print.info(`scanned ${result.scanned} files`);
    print.info(`changed ${result.changed} files`);
    if (options.dryRun) {
      print.success("dry run complete");
      return;
    }
    print.success(`synced ${result.synced} files`);
  }
});

