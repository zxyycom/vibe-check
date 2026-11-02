# 按 Git 文件变化选择 Check

需要以真实 Git comparison 驱动 Check 选择时使用本专题；共同 Run 时序见[API 机制](../api-mechanics.md#一次-run-的生命周期)。

## 按文件变化选择 Check

`changes` 让 Definition 从一次 Git comparison 派生选择用的 change flags。`source` 的完整形状是
`{ compareWith: string }`；`compareWith` 是 Git revision。`flags` 把非空 region ID 映射到 project-root-relative、
原生完整列表 glob region，匹配规则和参数见[共享的 files 选择语义](collecting-project-files.md#共享的-files-选择语义)。region 仅接受必填 `patterns` 字符串数组，负规则也写在该列表中；扫描默认排除不作用于 Git changed-path facts。
有效 `projectRoot` 可以嵌套在 repository 内；Git paths 与 region matching 都相对这个 root，跨 root 的重命名只保留 root 内的一侧。

Git snapshot 合并 `compareWith...HEAD`（两者 merge-base 到 HEAD）的已提交差异、staged 和 unstaged 差异，以及非 ignored 的 untracked paths，再去重并稳定排序。删除保留旧路径，重命名保留两侧路径；这些路径不要求当前仍存在于磁盘。

一次 invocation 的数据流固定如下：

```text
caller flags ─────────────────────────────┐
Git snapshot → matched change flags ──────┼→ canonical effective flags → selection and project.flags
Git snapshot ─────────────────────────────└→ project.changes (files or unavailable reason)
```

可信 snapshot 只发布命中至少一个 region 的稳定 `{ path, flags }` records；一个 path 可命中多个 regions。可信零命中为
`{ ok: true, files: [] }`，因此不派生 change flag。Git revision、repository 或 path evidence 不可信时为
`{ ok: false, reason }`，不带 `files`，但会把全部声明的 change flags 加入 effective flags，保守提供选择所需信号。最终仍求值完整 `enabledByFlags`：例如含 `not` 或 `exactlyOne` 的条件可能不命中，因此这不强制选中所有依赖 change flags 的 Check。
Controls 只能传普通 caller flags，不能传入 `vibe-check:change:` prefix。

```ts
import { defineContextCallback } from "@zxyycom/vibe-check";
import { changeFlag, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const sourceChanged = defineCheck({
  checkId: "source-changed",
  displayName: "Source changed",
  enabledByFlags: { when: changeFlag("source") },
  execute: defineContextCallback("check.execute", { contextNeeds: ["project"], callback: (options, { project }) => {
    const changes = project.changes;
    if (changes === undefined) {
      return { status: "unavailable", reason: { code: "changes-not-configured" } };
    }
    return {
      status: "passed",
      data: {
        evidence: changes.ok ? "matched" : "unavailable-conservative",
        effectiveFlags: project.flags,
        matchedPaths: changes.ok ? changes.files.map(({ path }) => path) : []
      }
    };
  } })
});

const definition = defineConfig({
  changes: {
    source: { compareWith: "origin/main" },
    flags: {
      source: { patterns: ["src/**", "!src/generated/**"] }
    }
  },
  checks: [sourceChanged],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(({ checkId }) => checkId === sourceChanged.checkId)
  ?.outcome;
if (outcome?.status !== "passed" && outcome?.status !== "not-applicable") {
  throw new Error("Change-aware Check did not settle successfully");
}
```

这个示例的 Check 由 `changeFlag("source")` 选择：命中时读取可信 paths，可信零命中时结算为
`not-applicable`，unavailable evidence 时仍运行但以 `changes.ok === false` 区分结果。`project.flags` 始终是上图的 canonical effective set；`project.changes` 才是 files 或 unavailable reason 的
evidence channel。要编写 condition、`prepare` 或 `execute`，继续阅读[Check lifecycle](extending-check-lifecycle.md)。

要审视未变更文件、零命中或重叠范围，可显式调用[change flag 调试工具](debugging-change-flags.md)；它不替代本专题的实际 Git evidence 或 effective flags。

## 按真实输入增量选择示例

日常反馈中，配置 JSON 改动需要语法检查；schema 或实例改动需要 schema 检查；文档链接还可能被其它文件的删除影响。

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
      config: { patterns: [...shared, "config/**/*.json"] },
      schema: {
        patterns: [...shared, "config/**/*.json", "schema/**/*.json", "!config/scratch/**"]
      }
    }
  },
  checks: [
    jsonValidation({
      files: { patterns: ["config/**/*.json"] },
      enabledByFlags: { when: any(all("daily", changeFlag("config")), "force") }
    }),
    jsonSchemaValidation({
      files: {
        patterns: ["config/**/*.json", "schema/**/*.json", "!config/scratch/**"]
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
      files: { patterns: ["handbook/**/*.md"] },
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

region 与实际文件选择需要显式同步业务规则；需要扫描默认排除目录时设置 `useDefaultExcludes: false`。完整规则见[本页前文](#按文件变化选择-check)。

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
