# Proposal

本 Change 让随包质量 Check 使用显式文件来源、统一选择规则和一致的 Finding 阻断政策，并减少重复文件枚举。

## Why

实施前的文件选择把 `excludeDirs` 与 `generatedFiles` 作为两种排除机制公开，同时根据 Git 是否成功隐式改变候选文件集合；三个 area-based 质量 Check 还会按 area 重复枚举项目文件，并且只有 function metrics 支持 non-blocking findings。这些差异增加配置、运行和结果解释成本。

## Outcome

调用方通过 `source/include/exclude` 完整决定每个文件范围，filesystem 与 git-worktree 的失败边界保持显式；每个 Check 对同一来源只枚举一次并计算多个 area；duplicate、file 与 function metrics 使用相同的 Finding policy、Record `blocking` 字段和 final counts。

## Scope

### Intended Change

- 将随包 Check 的文件选择 hard-cut 为可默认化的 `source/include/exclude`，默认 source 为 `filesystem`，另支持显式 `git-worktree`。
- 将文件候选枚举与多个 selection 的过滤分开，同一 Check 按来源枚举一次并形成命名集合；不增加 provider Check 或 Product-wide file context。
- 在 package-owned code-quality 边界共享 `blocking | non-blocking` policy、overlap 规则和 Finding 汇总，三个 area-based Check 均允许顶层默认与 area override。

### Resulting Impacts

- 同步六项 file-reading Check 的完整 resolved options、三个 metric constructor input、validation、preflight、tests、dogfood Definition 与文档。
- `git-worktree` 失败后不再退回 filesystem；两种来源的候选语义、submodule 行为和收集失败必须可分别验证。
- file metrics 与 duplicate detection 的 Record/final-data contract 增加 blocking 事实和 `blockingFindingCount`，相关指南、Quality Metrics、Case 与 package acceptance 材料同步更新。
- 既有 `excludeDirs/generatedFiles` 与无 source shape 作为非法 options 被 hard-cut，不提供 alias 或双读。

## Success Criteria

- 公共声明、运行时 validation 和所有随包文档只接受并说明 `source/include/exclude`。
- filesystem 与 git-worktree 在相同显式过滤规则下分别产生稳定候选集合，来源失败时不静默切换。
- 仓库 quality Run 的每个 area-based Check 对每种来源至多执行一次候选枚举。
- 三个代码质量 Check 都完整保留 findings，按 effective policy 形成 blocking Record 与统一 final counts。
- 目标测试、Test Evidence、文档/决策校验及 workspace full Gate 通过。

## Affected Owners

- `docs/scan-scope.md`
- `docs/quality-metrics.md`
- `docs/architecture.md`
- `docs/configuration.md` 与 `docs/checks/*.md`
- `src/package-checks/project-files/**`
- `src/package-checks/{duplicate-detection,file-metrics,function-metrics}/**`
- `scripts/project/quality/definition.ts`
- `docs/testing/cases/**` 与 `docs/decisions/**`
