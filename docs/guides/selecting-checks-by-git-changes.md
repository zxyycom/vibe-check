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
