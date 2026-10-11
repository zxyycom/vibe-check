import assert from "node:assert/strict";
import filesystem from "node:fs";
import promises from "node:fs/promises";
import processes from "node:child_process";
import { syncBuiltinESMExports } from "node:module";

import { createProjectFileRegionIndex } from "./project-file-region-index.ts";

// 独立进程在模块加载后封锁获取能力，避免改变同一 runner 中其它测试的宿主状态。
const report = process.stdout.write.bind(process.stdout);
const blocked = (): never => {
  throw new Error("unexpected acquisition");
};
for (const key of Object.keys(filesystem)) {
  if (typeof Reflect.get(filesystem, key) === "function") Reflect.set(filesystem, key, blocked);
}
for (const key of Object.keys(promises)) {
  if (typeof Reflect.get(promises, key) === "function") Reflect.set(promises, key, blocked);
}
for (const key of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"])
  Reflect.set(processes, key, blocked);
syncBuiltinESMExports();

const old = createProjectFileRegionIndex({
  fileSources: [["does-not-exist/deleted.ts"]],
  regionSources: [[{ id: "rule", kind: "patterns", patterns: ["**/*.ts"] }]]
});
const next = old.appendSources({
  fileSources: [["build/new.ts"]],
  regionSources: [[{ id: "actual", kind: "members", files: ["does-not-exist/deleted.ts"] }]]
});
assert.deepEqual(old.filesForRegion("rule"), ["does-not-exist/deleted.ts"]);
assert.deepEqual(next.filesForRegion("rule"), ["build/new.ts", "does-not-exist/deleted.ts"]);
assert.deepEqual(next.regionsForFile("does-not-exist/deleted.ts"), ["actual", "rule"]);
assert.deepEqual(next.filesForRegion("actual"), ["does-not-exist/deleted.ts"]);
assert.equal(next.filesForRegion("unknown"), undefined);
report("no I/O: passed\n");
