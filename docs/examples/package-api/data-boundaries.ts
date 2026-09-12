// #region package-api-example:canonical-json-snapshot
import { canonicalizeJsonObject, canonicalizeJsonValue } from "@zxyycom/vibe-check";

const authoredLimits = { maxFindings: 10 };
const limits = canonicalizeJsonObject(authoredLimits);
if (limits === undefined) throw new TypeError("Expected JSON object limits.");

authoredLimits.maxFindings = 20;
if (limits.maxFindings !== 10 || !Object.isFrozen(limits)) {
  throw new Error("Expected an independent frozen limits object.");
}

// 顶层不一定是对象时，选择 value 版本。
const fileList = canonicalizeJsonValue(["src/index.ts"]);
if (!Array.isArray(fileList) || !Object.isFrozen(fileList)) {
  throw new Error("Expected a frozen JSON array.");
}
// #endregion package-api-example:canonical-json-snapshot

// #region package-api-example:canonical-json-serialization
import { canonicalJsonBytes, canonicalJsonText } from "@zxyycom/vibe-check";

// 调用方决定哪些字段影响计算结果；工具只负责一致的数据表示。
const cacheInputs = { mode: "strict", paths: ["src/index.ts"] };
const keyText = canonicalJsonText(cacheInputs);
const keyBytes = canonicalJsonBytes(cacheInputs);

if (
  keyText !== canonicalJsonText({ paths: ["src/index.ts"], mode: "strict" }) ||
  new TextDecoder().decode(keyBytes) !== keyText
) {
  throw new Error("Expected one deterministic representation for the selected cache inputs.");
}
// #endregion package-api-example:canonical-json-serialization

// #region package-api-example:closed-structure-snapshot
import { snapshotClosedArray, snapshotExactClosedRecord } from "@zxyycom/vibe-check";

const onComplete = () => "done";
const authoredTask = { name: "build", onComplete, paths: ["src/index.ts"] };
const task = snapshotExactClosedRecord(authoredTask, ["name", "onComplete", "paths"]);
if (task === undefined || typeof task.name !== "string" || typeof task.onComplete !== "function") {
  throw new TypeError("Expected a closed task configuration with a name and callback.");
}

// 外层字段检查不验证 paths 的内容；数组结构和元素语义分别检查。
const selectedFiles = snapshotClosedArray(task.paths);
if (selectedFiles === undefined || !selectedFiles.every((path) => typeof path === "string")) {
  throw new TypeError("Expected a dense list of file paths.");
}
if (task.onComplete !== onComplete || task.paths !== authoredTask.paths) {
  throw new Error("Expected the shallow snapshot to preserve callback and nested references.");
}
// #endregion package-api-example:closed-structure-snapshot
