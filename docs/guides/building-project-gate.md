# 从项目质量目标构建 Gate

你可能已经有 lint、测试、配置校验等脚本。把它们组合成 Gate，关键不只是“一起运行”，而是回答三个问题：

1. 每项检查分别证明什么？
2. 哪些工作需要共享、等待或限制并发？
3. 最后什么结果允许继续，什么结果需要停止？

本文先跑通最小路径，再按实际问题展开九种场景。从最接近当前目标的一节开始，按需组合其中的做法。

## 先跑通：定义检查、运行、判断结果

安装与运行环境见 [README](../../README.md#安装)。以下是一个完整的 `quality.ts`，使用固定测量值，方便先观察通过和失败；实际项目中再替换成真实测量。

```ts
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const bundleSize = defineCheck({
  checkId: "bundle-size",
  displayName: "Bundle size",
  execute() {
    const actualBytes = 82_000;
    const maximumBytes = 100_000;
    const data = { actualBytes, maximumBytes };
    return actualBytes <= maximumBytes ? { status: "passed", data } : { status: "failed", data };
  }
});

const definition = defineConfig({
  checks: [bundleSize],
  outputs: { machinePublication: { enabled: false } }
});

const result = await run(definition);
process.exitCode = result.kind === "completed" && result.aggregate === "passed" ? 0 : 1;
```

在你安装 package 的项目中执行 `node quality.ts`。把 `actualBytes` 改成 `120_000`，Check 会失败，脚本退出非零。

这里有三层责任：

- Check 返回它自己的质量结论。
- `run` 执行整张图，并对本次有效 Checks 形成 `aggregate`。
- 项目脚本决定退出码。本例只接受正常完成且 aggregate 通过，其余情况统一退出 `1`。

`completed` 表示 Run 完整结算，不表示质量通过。默认聚合只在有效列表非空、且每项都 `passed` 时通过；未被 flags 选中的项不进入有效列表，已选中却返回 `not-applicable` 的项会使默认聚合失败。

**提醒还是阻断，在检查自己的规则中决定。** 自定义 Check 通过返回的 status 表达结论，warning message 本身不让检查失败。支持 `findingPolicy` 的随包 Check 可用 `"non-blocking"` 保留普通 Finding 而通过，用 `"blocking"` 让未豁免 Finding 阻断；工具不可用仍是 `unavailable`，不会因此放行。日常使用保留默认聚合即可；确需其它总体判断时再读 [aggregation](../api-mechanics.md#runcontrols-与-check-aggregation)。

**先确定独立结果，再拆 Check。** “编译、打包、读取包大小”如果只服务于一个验收结论，可以留在同一 execution；若产物结构和包大小需要分别判断，再考虑共享准备并拆出两个消费者。

## 按你遇到的问题阅读

| 你现在遇到的情况 | 场景 |
| --- | --- |
| 已有脚本，想接进 Gate | [1．接入已有检查](#1接入已有检查) |
| 多项检查重复做同一份准备 | [2．准备一次分别验收](#2准备一次分别验收) |
| 上游失败后，有的任务要停，有的还要解释失败 | [3．成功依赖与终态观察](#3成功依赖与终态观察) |
| 本地与 CI 要运行不同集合 | [4．按任务选择检查](#4按任务选择检查) |
| 小改动总是启动所有材料检查 | [5．按真实输入增量选择](#5按真实输入增量选择) |
| 测试分组了，但仍然全选或漏选 | [6．找出测试真正读取的输入](#6找出测试真正读取的输入) |
| 需要完整检查，但重复计算昂贵 | [7．复用计算而非通过结论](#7复用计算而非通过结论) |
| 并发检查争抢资源 | [8．表达并发约束](#8表达并发约束) |
| 失败只有文本，或已有结构不适合直接发布 | [9．把工具输出转换为结构化诊断](#9把工具输出转换为结构化诊断) |

### 运行本页示例

每个 TypeScript 片段独立定义一份 `definition`。任选一个片段，按以下步骤运行：

1. 在已安装 package 的项目中，将片段保存为 `quality.ts`，并准备该节列出的文件或工具。
2. 片段若只定义 `definition`，按[最小入口](#先跑通定义检查运行判断结果)补齐 `run` 导入，并在 `definition` 之后添加调用与退出码判断。场景 4、5 已包含带 flags 的完整入口，直接使用各自的 `runGate`。
3. 执行 `node quality.ts`，核对该节的 Check 结果、`aggregate` 和进程退出码。

## 1．接入已有检查

**情况：** 项目已经有 `tools/check-config.mjs`，成功退出 `0`，发现错误退出非零。

先保留脚本拥有的检查逻辑，用 `commandCheck` 接管进程生命周期。以下片段的调用步骤见[运行本页示例](#运行本页示例)：

```ts
import { commandCheck, defineConfig } from "@zxyycom/vibe-check";

const configCheck = commandCheck({
  checkId: "config",
  displayName: "Configuration",
  executable: process.execPath, // 复用启动 quality.ts 的运行时；本文使用 Node。
  arguments: ["tools/check-config.mjs"],
  environment: { mode: "exact" },
  timeoutMs: 30_000,
  outputByteLimit: 1024 * 1024
});

const definition = defineConfig({
  checks: [configCheck],
  outputs: { machinePublication: { enabled: false } }
});
```

这里的脚本路径和两个限额是项目选择，运行前需要有对应脚本。普通非零退出形成 `failed`；无法启动、超时等无法获得可信结果的情况形成 `unavailable`。Product 负责取消、受限输出捕获和结算。

`executable` 是要启动的程序，`arguments` 才是传给它的参数。按上文执行 `node quality.ts` 时，`process.execPath` 是当前 Node 的绝对路径，所以子进程相当于执行 `node tools/check-config.mjs`，并不是直接执行 `.mjs` 文件。使用绝对路径也无需从 child 的 `PATH` 寻找 Node。

若入口改用 Bun，这里复用的也会是 Bun；需要固定使用 Node 的脚本，应由项目提供 Node 的绝对路径作为 `executable`。`commandCheck` 不安装或自动选择运行时。

选择哪种接法，取决于你已有的入口：

| 已有能力 | 接入方式 |
| --- | --- |
| 工具退出码已能表达结果 | 使用上面的 `commandCheck`。 |
| 有可 import、不会自动启动 CLI 的校验函数 | 在自定义 Check 的 `execute` 中调用，保留领域结果；可取消工作继续传递 `signal`。 |
| 完整命令输出还需要解析成领域事实 | 使用 `afterCommand`，由项目验证工具协议；见场景 9。 |

命令通过 executable 和独立 arguments 表示。默认不继承父进程环境；需要环境变量时显式提供必要值，确需继承时再选 `inherit`。使用独立脚本承接多步骤 workflow，通常比把 shell pipeline 塞进一个参数更清楚。

**试一下：** 让脚本分别退出 `0`、退出 `1`、超过 timeout，确认三种结果被区分。先保持原检查覆盖和结果含义，再决定是否拆分。

完整契约：[执行外部命令](./command-check.md)、[自定义 Check](./extending-check-lifecycle.md)。

## 2．准备一次，分别验收

**情况：** 产物清单需要一次构建才能取得，包大小和文件数量检查都要用它。你希望构建一次，但保留两项验收结果。

把昂贵准备放在 provider，把独立判断留在 consumer。下面用固定清单摘要代替真实构建，按[公共运行约定](#运行本页示例)观察数据与责任关系：

```ts
import { defineCheck, defineConfig } from "@zxyycom/vibe-check";

const manifest = defineCheck({
  checkId: "artifact-manifest",
  displayName: "Artifact manifest",
  omitQuietPassedRow: true,
  parseData(data) {
    if (
      data.version !== 1 ||
      typeof data.totalBytes !== "number" ||
      !Number.isSafeInteger(data.totalBytes) ||
      data.totalBytes < 0 ||
      typeof data.fileCount !== "number" ||
      !Number.isSafeInteger(data.fileCount) ||
      data.fileCount < 0
    )
      throw new TypeError("Invalid artifact manifest");
    return { version: 1, totalBytes: data.totalBytes, fileCount: data.fileCount };
  },
  execute: () => ({
    status: "passed",
    data: { version: 1, totalBytes: 82_000, fileCount: 3 }
  })
});

const size = defineCheck({
  checkId: "artifact-size",
  displayName: "Artifact size",
  dependsOn: [manifest.checkId],
  execute({ dependencies }) {
    const read = dependencies.get(manifest.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const data = manifest.parseData(read.data);
    return data.totalBytes <= 100_000 ? { status: "passed", data } : { status: "failed", data };
  }
});

const contents = defineCheck({
  checkId: "artifact-contents",
  displayName: "Artifact contents",
  dependsOn: [manifest.checkId],
  execute({ dependencies }) {
    const read = dependencies.get(manifest.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const data = manifest.parseData(read.data);
    return data.fileCount > 0 ? { status: "passed", data } : { status: "failed", data };
  }
});

const definition = defineConfig({
  checks: [manifest, size, contents],
  outputs: { machinePublication: { enabled: false } }
});
```

两条消费者关系都直接指向 provider。parser 恢复领域类型并验证数据；依赖声明提供读取授权，两者职责不同。

**预期结果：** provider 成功后，两项消费者各自运行。把 `totalBytes` 改成 `120_000`，大小检查失败，但文件数量检查仍可通过；它们不共享判决。provider 失败则阻断两项消费者。

本例的 provider 只准备材料，安静通过后无需占一行结果，因此设置 `omitQuietPassedRow: true`。只有 `passed` 且没有 Records/messages 时才省略完成行；有 data 不影响省略，失败或带诊断时仍显示。它仍参与依赖、聚合和完整结果，TTY 中的运行状态也仍可见。需要保留成功行时，省略此字段即可。见[省略安静通过行](./extending-check-lifecycle.md#省略安静通过行)。

真实 provider 若创建临时目录，应由资源 owner 在最后一个消费者结束后清理；例如用 Run 外层的 `try/finally` 管理生命周期。破坏性或失败注入测试使用独立材料，避免污染共享只读输入。

只有确需同 Run 的非 JSON 引用时才另选 handoff；普通清单、路径和摘要用 canonical data 即可。见[依赖与类型化数据](./check-dependencies.md)。

## 3．成功依赖与终态观察

**情况：** 配置校验失败后，业务检查应停止，但汇总检查仍要报告发生了什么。

按[公共运行约定](#运行本页示例)执行下面的组合，比较 `dependsOn` 与 `observes` 对上游失败的处理：

```ts
import { defineCheck, defineConfig } from "@zxyycom/vibe-check";

const config = defineCheck({
  checkId: "config",
  displayName: "Configuration",
  execute: () => ({ status: "failed", data: { valid: false } })
});

const consumer = defineCheck({
  checkId: "use-config",
  displayName: "Use configuration",
  dependsOn: [config.checkId],
  execute: () => ({ status: "passed", data: { consumed: true } })
});

const audit = defineCheck({
  checkId: "audit-config",
  displayName: "Audit configuration",
  observes: [config.checkId],
  execute({ dependencies }) {
    const outcomes = dependencies.list().map(({ checkId, outcome }) => ({
      checkId,
      status: outcome.status
    }));
    return { status: "passed", data: { outcomes } };
  }
});

const definition = defineConfig({
  checks: [config, consumer, audit],
  outputs: { machinePublication: { enabled: false } }
});
```

| Check | 预期行为 |
| --- | --- |
| `config` | 固定失败，模拟无效配置。 |
| `use-config` | 不进入 execute，结算为 `unavailable / dependency-not-passed`。 |
| `audit-config` | 等 config 终态后执行，记录它失败；自身完成审计而通过。 |

审计通过不会把配置失败变成通过，默认 aggregate 仍失败。

两种关系都只授权直接读取。`observes` 可以观察无 data 的终态，因此这里只读取 status；需要 data 时再收窄状态。加入 flags 后，还要确保观察者与被观察者的选择符合你的任务，`observes` 本身不会传播选择。

## 4．按任务选择检查

**情况：** 本地快速检查只跑配置；CI 同时检查配置和文档；开发者还可以单独查文档。

preset 是项目入口的命名，Product 只接收普通 flags：

```ts
import { any, defineConfig, jsonValidation, markdownLint, run } from "@zxyycom/vibe-check";

const definition = defineConfig({
  checks: [
    jsonValidation({
      checkId: "config",
      files: { include: ["config/**/*.json"] },
      enabledByFlags: { when: any("local", "ci", "config") }
    }),
    markdownLint({
      checkId: "docs",
      files: { include: ["handbook/**/*.md"] },
      findingPolicy: "blocking",
      enabledByFlags: { when: any("ci", "docs") }
    })
  ],
  outputs: { machinePublication: { enabled: false } }
});

async function runGate() {
  const result = await run(definition, { flags: ["local"] });
  process.exitCode = result.kind === "completed" && result.aggregate === "passed" ? 0 : 1;
  return result;
}

if (import.meta.main) await runGate();
```

这里的 `import.meta.main` 让脚本在直接执行 `node quality.ts` 时调用 `runGate`，被其它模块 import 时不自动启动。项目中需有对应的配置与文档文件。换成 `["ci"]` 会选择两项，`["docs"]` 只选择文档。未选项仍保留 `not-applicable` facts，但不参加本次有效列表的默认聚合。

若只选择一个下游 Check，却希望同时启动它的前置项，在下游的 `enabledByFlags` 加 `propagateDependsOn: true`。它补齐传递 `dependsOn`，不是把所有相邻节点都选中，也不保证前置项通过。

argv、help 和未知 preset 的拒绝由项目入口处理。用户输入先验证再映射，避免拼错任务名后静默得到空检查集合。精确规则见[按 flag 选择 Check](./extending-check-lifecycle.md#按-flag-选择-check)。

## 5．按真实输入增量选择

**情况：** 日常反馈中，配置 JSON 改动需要语法检查；schema 或实例改动需要 schema 检查；文档链接还可能被其它文件的删除影响。

增量选择分两步：Definition 声明哪些输入变化会生成 flag，Check 声明在什么任务下使用它。

```ts
import {
  all,
  any,
  changeFlag,
  defineConfig,
  run,
  jsonValidation,
  jsonSchemaValidation,
  markdownLinkValidation
} from "@zxyycom/vibe-check";

const shared = ["quality.ts", "package.json", "pnpm-lock.yaml"];
const definition = defineConfig({
  changes: {
    source: { compareWith: "HEAD" },
    flags: {
      config: { include: [...shared, "config/**/*.json"] },
      schema: {
        include: [...shared, "config/**/*.json", "schema/**/*.json"],
        exclude: ["config/scratch/**"]
      }
    }
  },
  checks: [
    jsonValidation({
      files: { include: ["config/**/*.json"] },
      enabledByFlags: { when: any(all("daily", changeFlag("config")), "force") }
    }),
    jsonSchemaValidation({
      files: {
        include: ["config/**/*.json", "schema/**/*.json"],
        exclude: ["config/scratch/**"]
      },
      schemas: [{ id: "urn:example:config", path: "schema/config.json" }],
      bindings: [
        {
          id: "app",
          instancePath: "config/app.json",
          schemaId: "urn:example:config"
        }
      ],
      enabledByFlags: { when: any(all("daily", changeFlag("schema")), "force") }
    }),
    markdownLinkValidation({
      files: { include: ["handbook/**/*.md"] },
      findingPolicy: "blocking",
      enabledByFlags: { when: any("daily", "force") }
    })
  ],
  outputs: { machinePublication: { enabled: false } }
});

async function runGate() {
  const result = await run(definition, { flags: ["daily"] });
  process.exitCode = result.kind === "completed" && result.aggregate === "passed" ? 0 : 1;
  return result;
}

if (import.meta.main) await runGate();
```

上例的日常调用需要 `daily`，改用 `["force"]` 可强制选择三项。schema 文件中的根 `$id` 应为 `urn:example:config`，实例是 `config/app.json`；这是本例显式声明的材料结构。

`changes.flags.*` 的 region 要求提供 `include`，`exclude` 可省略，默认等同于 `[]`。上面的 config region 没有排除项，所以不写；schema region 则给出具体排除。随包 Check 的 `files.exclude` 同样可省略，实际文件选择仍需与 change region 的输入范围保持一致。

本例约定 `config/scratch/**` 是不被正式实例或 schema 引用的草稿，只检查 JSON 语法，不参与 schema 验收。因此 schema 的变化 region 与实际文件选择都排除它；如果草稿后来成为正式输入，两处都需调整。

| 改动 | daily 下选择 |
| --- | --- |
| `config/app.json` | JSON、Schema、链接。 |
| `schema/config.json` | Schema、链接。 |
| `config/scratch/local.json` | JSON、链接；不选择 Schema。 |
| 仅删除一张被文档引用的图片 | 链接；即使 Markdown 本身没改。 |
| `quality.ts` 或 lockfile | 三项全部。 |

这里 `HEAD` 适合查看尚未提交的工作区改动；刚提交的内容需要选择更早的比较基准。整条 PR 应使用项目明确取得的 PR 基准，而不是照抄本地策略。

实际输入还可能包括外部 schema references、生成器、共享读取函数或配置。随着这些来源加入，region 必须同步扩展。尚未建模反向依赖的链接检查保留完整运行，比只匹配 Markdown 更安全。

Git evidence 可信但零命中，与 Git 不可用不同。不可用时会提供所有已声明 change flags；上例使用正向条件，使 daily 保守选择两项材料检查。`changeFlag` 仅生成 token，selection 与 callback 共用 effective flags；证据详情读取 `project.changes`。

更多边界见 [文件变化选择](../api-mechanics.md#按文件变化选择-check)。

## 6．找出测试真正读取的输入

**情况：** 你把测试分成 parser、configuration、source-identity 三组，却发现按同名目录选择会漏掉测试。

此时先列真实读取，再写 region：

| 测试目的 | 真实输入示例 | 选择策略 |
| --- | --- | --- |
| parser 私有行为 | parser 源码、测试、fixtures、共享运行工具。 | 只在已证明无关时排除其它私有模块。 |
| configuration constructor 行为 | configuration 源码，加上实际调用的 JSON reader 与 validator。 | reader 改动也选择此组，尽管目录名不同。 |
| 全源 identity 审计 | 整个 source tree 和 provenance 映射。 | 保持全源输入；测试文件所在目录不能代表扫描范围。 |

例如，修改 JSON reader 后，应同时选择它自己的测试和实际调用它的 configuration 测试；只改无关私有模块时，前两组可能跳过，但全源审计仍有工作。

在收窄前，至少验证：

- 每组的 test file、fixture 及工具链输入的新增、修改、删除都能触发该组。
- 共享和未知输入有保守路径，人工完整测试入口仍可用。
- 用已确认无关的输入变更验证跳过，并保留各组独立的验收目的。

收窄的是执行条件：相关输入变化时，该组仍完整证明原有目标。将触发与跳过的对照随 region 一起维护。

## 7．复用计算，而非通过结论

**情况：** 你写了一个检查 `dist/app.js` gzip 大小的 Check。相同文件反复压缩有成本，但大小阈值仍应按本次规则判断。

用 `cacheJsonByKey` 保存自己计算的大小，而不是上次的通过结论。下面每次都读取当前文件，用同一份 bytes 生成 key 并计算；调用步骤见[运行本页示例](#运行本页示例)：

```ts
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { cacheJsonByKey, defineCheck, defineConfig } from "@zxyycom/vibe-check";

function parseMeasurement(value: unknown): { compressedBytes: number } {
  if (
    value === null ||
    typeof value !== "object" ||
    !("compressedBytes" in value) ||
    typeof value.compressedBytes !== "number" ||
    !Number.isSafeInteger(value.compressedBytes) ||
    value.compressedBytes < 0
  )
    throw new TypeError("Invalid gzip measurement");
  return { compressedBytes: value.compressedBytes };
}

const gzipSize = defineCheck({
  checkId: "gzip-size",
  displayName: "Gzip size",
  options: { maximumBytes: 100_000 },
  async execute({ options, project }) {
    const source = await readFile(resolve(project.root, "dist/app.js"));
    const level = 9;
    const key = JSON.stringify({
      sourceHash: createHash("sha256").update(source).digest("hex"),
      measurementRevision: "gzip-size-v1",
      level,
      nodeVersion: process.versions.node,
      zlibVersion: process.versions.zlib ?? null,
      bunVersion: process.versions.bun ?? null
    });
    const cached = await cacheJsonByKey({
      directory: resolve(project.root, ".cache/quality/gzip-size"),
      namespace: "my-project.gzip-size",
      version: "1",
      key,
      parse: parseMeasurement,
      compute: () => ({ compressedBytes: gzipSync(source, { level }).byteLength })
    });
    const maximumBytes = options.maximumBytes;
    const data = {
      compressedBytes: cached.value.compressedBytes,
      maximumBytes,
      cacheSource: cached.source
    };
    return data.compressedBytes <= maximumBytes
      ? { status: "passed", data }
      : { status: "failed", data };
  }
});

const definition = defineConfig({
  checks: [gzipSize],
  outputs: { machinePublication: { enabled: false } }
});
```

运行前需有 `dist/app.js`。这里读取已生成产物；构建本身如何增量复用是另一项任务，不由这个 key 覆盖。

写自己的缓存时，分清三件事：

| 部分 | 本例如何定义 |
| --- | --- |
| 哪些变化必须重算？ | key 包含文件内容摘要、计算实现版本、压缩参数与运行时/压缩库版本；计算读取其它输入时也要加入。 |
| 复用的事实是什么？ | payload 只有 `compressedBytes`；`version` 标识 payload 格式，`parse` 验证读取和新计算的值。 |
| 本次是否通过？ | 每次用当前 `maximumBytes` 判断，包括缓存命中时。阈值不影响压缩结果，因此不进入 key。 |

缓存目录是项目拥有、允许写入并可删除的本地目录。helper 负责读写与失效回退，不判断 key 是否完整，也不提供防篡改或保密保证；本例显式从 `project.root` 解析目录。

**试一下：**

1. 连续运行两次，大小相同，`cacheSource` 从 `computed` 变成 `cache`。
2. 改文件内容或 `level`，应重新计算；计算实现变化时同步更新 `measurementRevision`。
3. 只把阈值降到实测大小以下，即使命中缓存，也应失败。
4. 删除或破坏缓存文件，应重新计算；存储失败不抹掉本次已计算的结果，计算或 payload 校验失败则不能当成通过。

selection 决定是否做检查；cache 只复用检查内部的计算。本例的机制正确性与性能收益分别验证，是否值得缓存仍需测量。完整 helper 契约见[缓存计算结果](./cache-results.md)；现成 Check 已有缓存选项时，可直接使用其能力。

## 8．表达并发约束

**情况：** 三组测试各自会启动重工作，你希望同时最多两组运行，但轻量检查仍可使用第三个总任务槽位。

下面的组合按[公共运行约定](#运行本页示例)执行：

```ts
import { defineCheck, defineConfig } from "@zxyycom/vibe-check";

const runners = ["unit", "integration", "typecheck"].map((checkId) =>
  defineCheck({
    checkId,
    displayName: checkId,
    resourceClaims: { runner: 1 },
    async execute() {
      // 用短等待模拟已等待的异步工作；实际项目在这里调用真实检查。
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { status: "passed", data: {} };
    }
  })
);

const metadata = defineCheck({
  checkId: "metadata",
  displayName: "Metadata",
  execute: () => ({ status: "passed", data: {} })
});

const definition = defineConfig({
  checks: [...runners, metadata],
  scheduler: { maxParallel: 3, resourceCapacities: { runner: 2 } },
  outputs: { machinePublication: { enabled: false } }
});
```

三种约束分别回答不同问题：

| 约束 | 表达的意思 |
| --- | --- |
| `scheduler.maxParallel: 3` | 同时最多运行三个 Check。 |
| `runner: 2`，每组 claim 1 | 同时最多运行两组声明了该资源的任务。 |
| 两项都声明 `mutex: ["shared-fixture"]` | 若它们会改同一份 fixture，同一时刻只能运行其中一项。 |

需要共享 fixture 互斥时，将上表的同名 mutex 分别加入对应 Check；不必让其它独立测试一起串行。所有 claims 在准入时原子取得，结束后释放。

这里的 unit 是逻辑配额，不是 CPU 核或物理内存。第三个槽位可供轻量任务使用，但是否立即被选中取决于调度条件；容量 `2` 也不是性能最优承诺。先表达真实硬约束，再通过配对测量判断是否需要调整策略。

完整机制见[调度 Check](./scheduling.md)。

## 9．把工具输出转换为结构化诊断

**情况：** 你想把失败位置和原因变成可展示、可消费的 Records，但工具输出可能只有文本，也可能已有另一种结构。

先确认工具能提供什么：有稳定 JSON 模式时优先使用；自己拥有的 validator 可直接返回领域数据；只有文本模式时，再为已知格式写 parser。没有稳定格式的任意日志不能可靠还原成诊断，此时保留失败结论，不编造文件、行号或错误码。

### 9.1．只有文本：解析明确的格式

假设现有工具约定每行输出 `config/app.json:<行号>: MISSING_NAME`，退出 `0` 表示通过，普通非零退出表示检查失败。下面固定输出一行模拟它，按[公共运行约定](#运行本页示例)执行；替换成真实命令时，parser 也要遵循真实协议。

```ts
import {
  commandCheck,
  defineConfig,
  type CheckResult,
  type AfterCommandContext
} from "@zxyycom/vibe-check";

type DiagnosticData = { exitCode: number; diagnosticsAvailable?: boolean };

function parseTextDiagnostics(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const match = /^config\/app\.json:([1-9][0-9]*): MISSING_NAME$/.exec(line);
      if (!match) throw new TypeError("Unsupported diagnostic line");
      const lineNumber = Number(match[1]);
      if (!Number.isSafeInteger(lineNumber)) throw new TypeError("Invalid line number");
      return { path: "config/app.json", line: lineNumber, code: "missing-name" };
    });
}

const afterCommand = {
  execute({ command, records }: AfterCommandContext): CheckResult<DiagnosticData> {
    if (command.exitCode === 0) return { status: "passed", data: { exitCode: 0 } };
    let diagnostics;
    try {
      diagnostics = parseTextDiagnostics(command.stdout);
    } catch {
      return {
        status: "failed",
        data: { exitCode: command.exitCode, diagnosticsAvailable: false }
      };
    }
    diagnostics.forEach((data, index) => records.report({ id: "config-" + index }, data));
    return {
      status: "failed",
      data: { exitCode: command.exitCode, diagnosticsAvailable: true }
    };
  }
};

const check = commandCheck({
  checkId: "config-text-diagnostics",
  displayName: "Configuration diagnostics",
  executable: process.execPath,
  arguments: [
    "--eval",
    'process.stdout.write("config/app.json:3: MISSING_NAME\\n"); process.exit(1);'
  ],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024,
  afterCommand
});

const definition = defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
});
```

输出被转换为 `{ path: "config/app.json", line: 3, code: "missing-name" }`。parser 只接受这里声明的格式；混入一行无法识别的日志，整组诊断就不发布，Check 仍保留 `failed`。如果工具把诊断写在 stderr，应读取对应通道，而不是将 stdout/stderr 任意拼接。

### 9.2．已有结构：验证并映射为项目字段

另一个工具输出 `{ errors: [...] }`，使用 `filename`、`location.row` 和工具错误码 `CFG001`；项目则需要 `path`、`line` 和 `missing-name`。先验证源结构，再做字段、错误码和公开范围的转换，而不是把 JSON 原样塞进 Record。此片段独立使用[公共运行约定](#运行本页示例)。

```ts
import {
  commandCheck,
  defineConfig,
  type CheckResult,
  type AfterCommandContext
} from "@zxyycom/vibe-check";

type DiagnosticData = { exitCode: number; diagnosticsAvailable?: boolean };

function projectJsonDiagnostics(text: string) {
  const value: unknown = JSON.parse(text);
  if (
    value === null ||
    typeof value !== "object" ||
    !("errors" in value) ||
    !Array.isArray(value.errors)
  )
    throw new TypeError("Expected an errors array");
  return value.errors.map((item) => {
    if (
      item === null ||
      typeof item !== "object" ||
      item.filename !== "config/app.json" ||
      item.rule !== "CFG001" ||
      item.location === null ||
      typeof item.location !== "object" ||
      typeof item.location.row !== "number" ||
      !Number.isSafeInteger(item.location.row) ||
      item.location.row < 1
    )
      throw new TypeError("Unsupported diagnostic");
    return { path: "config/app.json", line: item.location.row, code: "missing-name" };
  });
}

const afterCommand = {
  execute({ command, records }: AfterCommandContext): CheckResult<DiagnosticData> {
    if (command.exitCode === 0) {
      return { status: "passed", data: { exitCode: 0 } };
    }
    let diagnostics;
    try {
      diagnostics = projectJsonDiagnostics(command.stdout);
    } catch {
      return {
        status: "failed",
        data: { exitCode: command.exitCode, diagnosticsAvailable: false }
      };
    }
    diagnostics.forEach((data, index) => records.report({ id: "config-" + index }, data));
    return {
      status: "failed",
      data: { exitCode: command.exitCode, diagnosticsAvailable: true }
    };
  }
};

const check = commandCheck({
  checkId: "config-json-diagnostics",
  displayName: "Configuration diagnostics",
  executable: process.execPath,
  arguments: [
    "--eval",
    'process.stdout.write(JSON.stringify({errors:[{filename:"config/app.json",location:{row:3},rule:"CFG001",debug:"internal context"}]})); process.exit(1);'
  ],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024,
  afterCommand
});

const definition = defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
});
```

这个例子故意只支持一个已知文件和一种工具错误码，以清楚展示映射；实际 adapter 按协议扩充允许的范围。`debug` 等额外字段被丢弃，不会复制进 Record。Record 的领域 data 由 Check 自己定义，并不存在 Product 强制所有工具遵循的 `path/line/code` 诊断 schema。

**两种转换都应验证：** 有效输入得到一条相同形状的 Record，Check 仍为 `failed`；第二条格式错误、使用未支持的错误码或指向 `../outside.json` 时，整组拒绝，不会先发布第一条。非零退出的失败结论保留为 `diagnosticsAvailable: false`，不是把无法解析误当成没有问题。

上述原子性来自“先 map 验证全部，再 report”，不是 reporter 自带事务。这两个例子的兜底依赖工具以非零退出表达失败的约定；如果工具区分“发现错误”和“自身崩溃”的退出码，adapter 也要分别映射。启动失败、超时等不会进入 `afterCommand`，仍由 Product 结算为 `unavailable`。

例子保持默认 `discard`，不保存原始输出；Records 仍进入 Run 的内存结果与默认进度预览，启用 machine publication 后也会发布。需要排障 transcript 时，显式配置 `output: { mode: "transcript" }` 和本次 `checkArtifactBaseDirectory`，并由 caller 管理访问和留存。preview 限额不承担脱敏责任。

更多约束见 [afterCommand](./command-check.md#调用方完成阶段)和[Run 输出](./run-outputs.md)。

## 把选中的场景带回项目

可以先选最接近当前问题的一节，按小步迭代：

1. 明确希望改变的结果，例如“安装一次，分别知道类型和运行时验收是否通过”。
2. 写出一组成功与失败对照，再选择 Check、关系和约束。
3. 只加入这次确实需要的能力。
4. 运行后核对单项 outcome、aggregate 和调用入口退出码；涉及性能时另做可比较测量。

将各场景的判断顺序用于自己的项目，选择适合当前目标的组合。精确契约由各专题拥有，按节内链接继续阅读。
