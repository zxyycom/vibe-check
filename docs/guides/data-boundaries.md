# Core 数据工具：JSON 规范化与结构快照

这些公开 Core tool 让调用方复用 Core 的数据处理规则：取得独立的 JSON 数据副本、生成确定性文本或字节，
或检查配置对象和数组的外层结构。它们从 package root 导入，无需创建 Check、Project Definition 或 Run。
工具负责下表中的数据处理；调用方仍负责字段含义、取值范围和业务规则。

## 选择工具

两组工具解决不同问题，不是一条必须依次调用的流水线。

| 需要的结果 | 选择 | 成功结果 | 不符合输入规则时 |
| --- | --- | --- | --- |
| 独立、递归冻结的 JSON 数据副本 | `canonicalizeJsonValue`；顶层必须是对象时用 `canonicalizeJsonObject` | 规范化后的 JSON 值或对象 | 返回 `undefined` |
| 确定性 JSON 文本或 UTF-8 字节 | `canonicalJsonText` / `canonicalJsonBytes` | 文本 / `Uint8Array`，内部已执行规范化，无须先调用 `canonicalize*` | 抛出 `TypeError` |
| 字段恰好匹配的配置对象，或无空洞的标准数组 | `snapshotExactClosedRecord` / `snapshotClosedArray` | 冻结的浅副本，保留字段值或元素的引用 | 返回 `undefined` |

JSON 工具只接受下文定义的 JSON 数据。结构快照不要求字段值或元素是 JSON，因而也适合包含回调的配置。
输入可以是程序构造的值，也可以是解析得到的数据；是否来自外部，不改变各工具的输入规则。

## 取得独立的 JSON 副本

当需要保留一份不会被调用方后续修改影响的数据时，使用规范化工具。对象版本直接约束顶层类型；
value 版本也接受数组和 JSON 基本值。两者都会递归复制并冻结支持的数据，而不是冻结原对象。

```ts
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
```

## 生成确定性文本或字节

调用方先决定哪些字段参与比较或缓存身份，再选择文本或字节输出。同一组数据仅改变对象属性的插入顺序，
不会改变输出；数组元素顺序仍然有意义。字节版本可直接用于摘要计算或二进制接口，不要求调用方重复编码步骤。
摘要计算本身和缓存 key 的完整性不由这些工具负责。

```ts
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
```

## 检查含回调的配置结构

结构快照可保留函数、`undefined` 和嵌套引用。先检查外层有哪些字段，再验证字段内容；需要检查嵌套数组时，
单独调用数组工具。它们不把整个配置转换为 JSON，也不深复制或冻结回调及其关联对象。

```ts
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
```

## Canonical JSON

### 输入与副本

输入接受 `null`、boolean、string、有限 number、使用 `Array.prototype` 的无空洞数组，以及使用
`Object.prototype` 或 null prototype 的对象。拒绝 `undefined`、非有限 number、function、symbol、bigint、
循环引用、存取器属性、不可枚举的自有属性、数组额外自有属性和其它原型。数组自身的标准 `length` 属性是例外。
共享但非循环的引用可以接受，规范化结果不承诺保留原引用之间的别名关系。

`canonicalizeJsonValue` 返回独立、递归冻结的 JSON 值；`canonicalizeJsonObject` 额外要求顶层为非数组对象。
数值 `-0` 转换为 `0`。结果中的对象使用 **null prototype**，没有继承的对象方法；检查属性时使用
`Object.hasOwn`，不要调用 `result.hasOwnProperty`。结果数组仍使用 `Array.prototype`。

`CanonicalJsonPrimitive`、`CanonicalJsonValue` 和 `CanonicalJsonObject` 描述静态数据结构，便于声明参数和结果。
它们不是运行时验证凭证：例如普通 `number` 类型仍可表示 `NaN`，对象类型也不能证明数据已冻结或没有循环。
有限数值和其它输入约束由规范化函数在运行时检查，不通过类型标注或断言取得。

### 确定性序列化

`canonicalJsonText` 输出无额外空白的 JSON 文本。对象 key 按 JavaScript 字符串 `<` 比较的顺序排列，
数组保留元素顺序，`-0` 输出为 `0`；字符串和其余基本值按 JSON 表示规则输出。
`canonicalJsonBytes` 返回该文本的 UTF-8 编码。这些表示规则属于公开契约，不随内部重构任意改变；
它们不承诺遵循其它 canonical-JSON 标准或执行 Unicode normalization。

**规范化对象不是已序列化的规范文本。** `JSON.stringify` 对整数索引属性的枚举顺序不同：对于含 `"2"`、`"10"`
两个 key 的对象，原生序列化先输出 `"2"`，`canonicalJsonText` 则先输出 `"10"`。需要上述确定性格式时，
直接使用 `canonicalJsonText` 或 `canonicalJsonBytes`，不要以 `JSON.stringify(canonicalizeJsonObject(...))` 替代。

## 闭合快照

`snapshotExactClosedRecord(value, keys)` 要求顶层是非数组的 plain/null-prototype 对象，且自有 key 恰好匹配
调用方提供的无重复 string 列表；所有自有属性必须是可枚举的数据属性。缺字段、多字段、symbol key、存取器属性或
不可枚举属性都会被拒绝。`keys` 应由调用方持有并保持稳定；成功结果是使用 `Object.prototype` 的冻结浅副本。

`snapshotClosedArray(value)` 要求使用 `Array.prototype` 的无空洞数组，除标准 `length` 与可枚举索引外没有其它
自有属性，也没有存取器属性。成功结果是冻结的标准数组浅副本。

两种快照均不检查字段值或元素的业务类型，也不要求它们是 JSON：函数、`undefined`、嵌套对象和引用可以保留。
嵌套内容不会被复制或递归冻结，`-0` 不会被转换。浅副本固定的是外层结构，不是整棵数据的内容；
需要独立 JSON 副本时选择规范化工具，不要把浅快照当作深层验证结果。

## 执行与适用边界

工具读取属性描述符，不调用输入的 getter 或 `toJSON` 方法。反射 Proxy 时仍可能执行其 trap；
trap 抛出导致输入无法读取时，按所选工具的失败模型返回 `undefined` 或抛出 `TypeError`，不承诺隔离 trap 的副作用。
这不是任意 JavaScript 对象的安全沙箱。

这些工具不解析 JSON 文本，不替代领域 schema 或字段验证，也不提供签名、认证、保密性或文件系统权限控制。
调用方按实际用途选择工具及失败处理，不必为了使用它们引入 Core 的运行生命周期。
