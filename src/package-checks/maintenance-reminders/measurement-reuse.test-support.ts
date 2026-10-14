import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { runGit } from "./maintenance-support.ts";

export const BASE = "a".repeat(40);
export const MIDDLE = "b".repeat(40);
export const HEAD = "c".repeat(40);

type GitResponse = Readonly<{ readonly stdout?: string; readonly failed?: boolean }>;
export type GitPlan = Readonly<Record<string, readonly GitResponse[]>>;
export type GitCall = Readonly<{ readonly command: string; readonly args: readonly string[] }>;

export function scriptedGit(plan: GitPlan = {}): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-maintenance-reuse-"));
  writeFileSync(join(root, "responses.json"), JSON.stringify(gitResponses(plan)));
  writeFileSync(join(root, "calls.json"), "[]");
  const program = `
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
const command = basename(process.argv[1]);
const args = process.argv.slice(2);
const calls = JSON.parse(readFileSync("calls.json", "utf8"));
const key = command + ":" + args.at(-1);
const prior = calls.filter(call => call.command + ":" + call.args.at(-1) === key).length;
calls.push({ command, args });
writeFileSync("calls.json", JSON.stringify(calls));
const responses = JSON.parse(readFileSync("responses.json", "utf8"))[key];
if (!responses) throw new Error("Unexpected Git command: " + key);
const response = responses[Math.min(prior, responses.length - 1)];
if (response.failed) process.exitCode = 1;
else process.stdout.write(response.stdout ?? "");
`;
  for (const command of ["rev-parse", "rev-list", "diff-tree"]) {
    writeFileSync(join(root, command), program);
  }
  return root;
}

export function calls(root: string): readonly GitCall[] {
  const parsed: unknown = JSON.parse(readFileSync(join(root, "calls.json"), "utf8"));
  assert.ok(Array.isArray(parsed));
  return parsed.map((candidate: unknown): GitCall => {
    assert.ok(typeof candidate === "object" && candidate !== null);
    assert.ok("command" in candidate && typeof candidate.command === "string");
    assert.ok("args" in candidate && Array.isArray(candidate.args));
    const args = candidate.args.map((argument: unknown): string => {
      assert.ok(typeof argument === "string");
      return argument;
    });
    return { command: candidate.command, args };
  });
}

function gitResponses(plan: GitPlan): GitPlan {
  return {
    [`rev-parse:HEAD^{commit}`]: [{ stdout: `${HEAD}\n` }],
    [`rev-parse:${HEAD}^{commit}`]: [{ stdout: `${HEAD}\n` }],
    [`rev-parse:${MIDDLE}^{commit}`]: [{ stdout: `${MIDDLE}\n` }],
    [`rev-parse:${BASE}^{commit}`]: [{ stdout: `${BASE}\n` }],
    "rev-list:HEAD": [{ stdout: `${HEAD}\n${MIDDLE}\n${BASE}\n` }],
    [`diff-tree:${HEAD}`]: [{ stdout: "2\t0\ttracked.txt\n" }],
    [`diff-tree:${MIDDLE}`]: [{ stdout: "1\t2\ttracked.txt\n" }],
    ...plan
  };
}

/** One instance records a deterministic raw Git-result script without process bootstrap. */
export function scriptedGitTransport(plan: GitPlan): Readonly<{
  calls: readonly GitCall[];
  execute: typeof runGit;
}> {
  const responsesByKey = gitResponses(plan);
  const recordedCalls: GitCall[] = [];
  const execute: typeof runGit = async (input) => {
    if (input.signal.aborted) return { kind: "cancelled" };
    const [command, ...args] = input.args;
    assert.ok(command !== undefined);
    const key = command + ":" + args.at(-1);
    const priorCount = recordedCalls.filter(
      (call) => call.command + ":" + call.args.at(-1) === key
    ).length;
    recordedCalls.push({ command, args });
    const responses = responsesByKey[key];
    assert.ok(responses !== undefined && responses.length > 0, `Unexpected Git command: ${key}`);
    const response = responses[Math.min(priorCount, responses.length - 1)];
    assert.ok(response !== undefined);
    return response.failed === true
      ? { kind: "failed" }
      : { kind: "succeeded", stdout: response.stdout ?? "" };
  };
  return { calls: recordedCalls, execute };
}
