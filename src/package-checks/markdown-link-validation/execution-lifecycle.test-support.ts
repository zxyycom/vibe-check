import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

/** A child-local Worker double observes execution's publication boundary without global test configuration. */
export function assertFinalizationPriority(): void {
  const child = spawnSync(
    process.execPath,
    [
      "--eval",
      `
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as workerThreads from "node:worker_threads";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mock } from "bun:test";
import { probeContainedNative, probeEndpointNative, readRegularFileNative } from "./src/package-checks/markdown-link-validation/io-native.ts";
let controller;
let scenario;
let exits;
let constructions;
mock.module("node:worker_threads", () => ({ ...workerThreads, Worker: class extends EventEmitter {
  constructor(url, options) {
    super();
    constructions++;
    this.root = options.workerData.root;
    this.flag = new Int32Array(options.workerData.cancellation);
  }
  postMessage(request) {
    queueMicrotask(() => {
      if (request.kind === "close") {
        if (scenario.abortOnClose) controller.abort();
        this.emit("message", { kind: scenario.closeFault ? "invalid-close" : "closed", id: request.id });
        exits++;
        this.emit("exit", 0);
        return;
      }
      const {job,id} = request;
      let response;
      if (job.kind === "containment") response = {kind:job.kind,id,probe:probeContainedNative(this.root,job.path,this.flag)};
      else if (job.kind === "endpoint") response = {kind:job.kind,id,probe:probeEndpointNative(job.path,this.flag)};
      else response = {kind:job.kind,id,read:readRegularFileNative(job.path,job.maxBytes,this.flag)};
      this.emit("message", response);
    });
  }
  terminate() { throw new Error("must not terminate active or normal work"); }
} }));
const { executeMarkdownLinkValidation } = await import("./src/package-checks/markdown-link-validation/execution.ts");
const { execute, MARKDOWN_LINK_OPTIONS, MARKDOWN_FILES } = await import("./src/package-checks/markdown-link-validation/constructor.test-support.ts");
const root = mkdtempSync(join(tmpdir(), "mdlink-finalization-"));
try {
  mkdirSync(join(root,"docs"));
  writeFileSync(join(root,"cache-file"), "not a directory");
  for (scenario of [
    {content:"[missing](missing.md)", closeFault:true, code:"target-unavailable"},
    {content:"[missing](missing.md)", closeFault:true, abortOnClose:true, code:"cancelled"},
    {content:"# Too large", max:1, closeFault:true, code:"source-too-large"},
    {content:"# Too large", max:1, closeFault:true, abortOnClose:true, code:"cancelled"},
    {content:"[bad](%00)", closeFault:true, code:"invalid-local-destination"},
    {content:"[missing](missing.md)", badCache:true, status:"failed"},
    {content:"# Okay", badCache:true, status:"passed"}
  ]) {
    controller = new AbortController();
    constructions = 0; exits = 0;
    writeFileSync(join(root,"docs","source.md"), scenario.content);
    const options = {...MARKDOWN_LINK_OPTIONS, limits:{...MARKDOWN_LINK_OPTIONS.limits,maxMarkdownBytes:scenario.max??1024},
      cache:scenario.badCache ? {enabled:true,directory:join(root,"cache-file","child")} : {enabled:false}};
    const result = await execute(executeMarkdownLinkValidation, options, root, MARKDOWN_FILES, controller.signal);
    assert.equal(constructions, 1);
    assert.equal(exits, 1, "execution must await exit before settlement");
    assert.equal(result.result.status, scenario.status ?? "unavailable");
    if (scenario.code) {
      assert.equal(result.result.reason.code, scenario.code);
      assert.deepEqual(result.records, []);
      assert.equal(result.result.data, undefined);
    }
    if (scenario.status === "failed") assert.equal(result.records.length, 1, "best-effort cache failure must not suppress a normal complete finding");
  }
  controller = new AbortController();
  constructions = 0; exits = 0;
  const empty = await execute(executeMarkdownLinkValidation, MARKDOWN_LINK_OPTIONS, root, {patterns:["nothing.md"]}, controller.signal);
  assert.equal(empty.result.status,"not-applicable");
  assert.equal(constructions,0);
} finally { rmSync(root,{recursive:true,force:true}); }
`
    ],
    { encoding: "utf8", timeout: 20_000 }
  );
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
}
