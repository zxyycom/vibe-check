# Proposal

本 Change 修复 `duplicateDetection` 的配置责任、构造方式、scanner command 和跨 code-area 检测语义，并以可验证的默认化 API 交付。

## Why

当前公开指南遗漏必填 `cache`，package marker 只有在 command 各字段完全等于默认值时才解析，token 阈值 preflight 接受后续 measurement 拒绝的数值；按 area 分进程还会漏掉跨 area 重复，并与 jscpd 内部 worker 形成不清晰的并发层。

## Outcome

消费者通过带完整默认值的 `duplicateDetection(options?)` 构造普通 Check，在每个 `codeAreas[id]` 中共同定义该区域的文件范围和行数/token 阈值；custom jscpd 只声明直接 executable，adapter 独占协议参数、版本 provenance 与自动 worker policy，并在一个 Check scope 内获得满足明确 area policy 的同 area、跨 area 与重叠 area 重复 finding。

## Scope

### Intended Change

重构 duplicate-detection constructor input/resolution、area-owned file selection、jscpd command resolution、scanner invocation、cache identity 与 measurement pipeline；让每个 area 共同拥有 `files`、`minimumLines` 与 `minimumTokens`，由构造函数补齐省略值；删除 public custom args；同步默认值、文档、项目配置、测试与 Case 证据。

### Resulting Impacts

公共 API 发生 prestable hard cut：`duplicateDetection` 从默认 Check value 变为 defaulted constructor，custom command 只允许 `{ kind: "custom", executable }`，不再公开 scan/availability args 或 workers；此前删除的顶层 `files`、`minimumLines`、`defaultMinimumTokens` 与 `minimumTokensByCodeArea` 仍不恢复。area 独立选择文件且可重叠，scanner 仍只执行一次，因此 exact-input union、cache、consumer authoring 和 public inventory 必须同步。

## Success Criteria

- `duplicateDetection()` 直接产生通过 owning preflight 的默认 Check，局部 constructor input 可以省略由 package 拥有的默认值。
- package/custom command 都有最小、可验证的 shape；package command 不暴露伪 executable，custom command 不暴露 adapter-owned args。
- cache directory 与 token/line 输入在 constructor 或 preflight 边界拒绝非法值；scanner tuning 不进入 public input。
- 每个 `codeAreas[id]` 是该区域文件范围和全部重复阈值的单一事实源，顶层没有默认阈值或 area override map。
- 一次扫描覆盖所有 area exact inputs 的去重并集；同 area、跨 area 与重叠 area finding 都按最严格涉及-area line/token 阈值过滤。
- 面向 package consumer 的说明通过 AI-ready 审核：constructor 默认值、定制方式、阈值关系和失败边界可从目标页面独立恢复。
- repository lockfile 保留实际 jscpd 测试基线，发布 package 声明有界 v5 compatibility range；candidate 和 external consumer 验证实际解析版本与真实 Run，而不把精确 scanner 版本变成用户 policy。
- 新增和修改代码符合项目编码规范，职责、边界校验、命名、scanner 失败和 cache identity 均可局部推理。
- 目标测试、Test Evidence、typecheck、lint、docs validation 与 full workspace verification 通过；local package candidate 已重新构建并通过 package verification。

## Affected Owners

- `docs/checks/duplicate-detection.md`
- `docs/configuration.md`
- `docs/scanner-dependencies.md`
- `docs/scan-scope.md`
- `src/package-checks/duplicate-detection/**`
- `scripts/project/quality/definition.ts`
- `docs/testing/cases/**`
