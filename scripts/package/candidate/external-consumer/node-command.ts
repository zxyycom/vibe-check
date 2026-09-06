import { isAbsolute } from "node:path";

const NODE_COMMAND_ENV = "VIBE_CHECK_NODE_CMD";

/** Resolves the mise-owned Node used to prove installed Product behavior. */
export function externalConsumerNodeCommand(environment: NodeJS.ProcessEnv = process.env): string {
  const command = environment[NODE_COMMAND_ENV];
  if (typeof command !== "string" || command.length === 0 || !isAbsolute(command)) {
    throw new Error(`${NODE_COMMAND_ENV} must identify the absolute mise-owned Node executable`);
  }
  return command;
}
