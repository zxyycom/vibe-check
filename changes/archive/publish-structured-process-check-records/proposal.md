# Proposal

本 Change 以受限的 owner-specific parser 让 Project Gate 在不复制子进程文本的前提下，为可证明的 lint 与 format failure 发布逐项 Records。

## Why

通用 process adapter 只能把所有非零退出压缩为一个 `command-failure` Record；oxlint 与 oxfmt 已有可闭合的机器或路径列表输出，可安全提供逐问题定位。其它工具没有同等契约，不能靠解析人读文本假装结构化。

## Outcome

仅当 `lint-product`、`lint-scripts` 或 `format-check` 的非零工具输出完整且已验证时，发布完整 owner-safe Records。输出、path 或 schema 任一边界不成立时，仍保留一个 generic failure Record 与 private transcript；failed 与 unavailable 的既有语义不变。

## Scope

### Intended Change

为 oxlint JSON 与 oxfmt `--list-different` 实现显式、owner-selected 的 nonzero failure projection，并只在三个对应 Gate entries 选择 adapter。现有 process base 仍只执行一次 child、先写 settled transcript；只有完整 safe projection 才替换 generic Record。

### Resulting Impacts

更新 development invocation、shared process execution seam、Gate entry composition、process regression tests、Process owner 文档、Test Evidence Case 与相关 active Decision。Bun test、tsgo、Git 与 ast-grep 的 process 行为不变；没有完整 projection 的任何 parser failure 仍回退 generic `command-failure`。

## Success Criteria

- 两个 lint Check 对完整 oxlint JSON 逐 diagnostic 发布仅含批准字段的 safe Records；format Check 对授权 target 的完整 list-different 输出逐路径发布 safe Records。
- 所有 parser、schema、path、identity 或安全边界失败都不发布 partial owner Records，仍返回一个 generic failure Record；timeout、cancel、spawn/status-null 与 transcript failure 的 unavailable mapping 不变。
- 成功子进程结果、执行次数与 transcript before-parse 顺序保持不变；raw stdout/stderr、message/help/snippet、absolute root、args、credential URL 与 digest 不进入 Record 或 message。
- 相关目标测试、scripts quality、Test Evidence、Decision、docs 和 Change Plan 验证通过，不运行 full Gate。

## Affected Owners

- `docs/script-tooling.md`：Project Gate process evidence、工具 invocation 与安全输出边界。
- `scripts/development/lint.ts`、`format.ts`：owner-selected tool protocol 与授权 target inputs。
- `scripts/project/gate/checks/process/**`、`process-entry.ts`、`definition.ts`：shared lifecycle 与 owner adapter composition。
- `docs/testing/cases/repository-tooling.md`、相邻 process tests、Test Evidence：current behavior evidence。
- `docs/decisions/publish-owner-structured-process-check-records.md`：长期方向与 alignment。
