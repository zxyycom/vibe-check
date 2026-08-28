# Tasks

任务先闭合 owner 与决策，再实施文件输入和 Finding contract，最后同步材料并完成全量验证。

## Readiness

- [x] 0.1 核对 file selection、quality result、configuration、测试策略、编码规范及相关 active decisions，并确认 Test Evidence 起点闭合。
- [x] 0.2 建立显式文件来源与共享代码质量 Finding policy 的长期决策。

## Implementation

- [x] 1.1 将 project-files contract 与收集实现改为 source/include/exclude，并提供按 source 一次枚举的 named selection 能力。
- [x] 1.2 迁移所有 file-reading Check options、validation、constructor defaults、execution 与 tests。
- [x] 1.3 为 duplicate、file 与 function metrics 建立共享 Finding policy 并统一 Record/final result。
- [x] 1.4 同步 repository quality Definition、公共文档、Check guides、Case 与 package projection/material inputs。

## Verification

- [x] 2.1 运行 project-files 与三个代码质量 Check 的最窄测试并审查语义 Case。
- [x] 2.2 运行 format、lint、typecheck、docs、decisions、Test Evidence 与 residue audit。
- [x] 2.3 重建精确 package candidate 并通过 workspace full Gate。
