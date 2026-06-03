import { createCli } from "@parshjs/core";
import { commandTree } from "./commandTree.gen";
import { createDaemonContext } from "./runtime/context";

export const cli = createCli({
  programName: "agent-worth",
  tree: commandTree,
  context: createDaemonContext()
});

declare module "@parshjs/core" {
  interface Register {
    cli: typeof cli;
  }
}

if (import.meta.main) {
  await cli.main();
}
