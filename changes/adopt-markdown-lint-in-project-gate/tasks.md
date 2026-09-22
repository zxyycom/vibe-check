# Tasks

本 Plan 按真实 corpus 结论、独立接线和可复核验证完成 Markdown lint dogfood。

## Readiness

- [x] 0.1 读取 repository-material、Project Gate、Markdown lint、Decision、Case owner 与相邻实现，确认 Gate 目前未选择 lint。
- [x] 0.2 通过公开 `markdownLint` 对 `docs/**/*.md` 与 `changes/**/*.md` 运行基线，记录 502 source、59 advisory Finding、规则分类和约 3.57 s 成本，并选择 advisory。
- [x] 0.3 将 Draft 收敛为 Plan，明确完整输入范围、required 增量条件、focused force path、link 全量边界和不修改 Product 的范围。

## Implementation

- [x] 1.1 在 repository-quality owner 增加固定规则、完整 docs/changes selection 和 non-blocking policy 的独立 `markdown-lint` Check。
- [x] 1.2 将 lint 接入 required/materials/quality/all manifest，声明 repository scan resource claim，并保留 links 的全量选择。
- [x] 1.3 更新 Project Gate、package guide、repository-material owner、Decision 与 Case，以说明当前 adoption 和 advisory migration boundary。
- [x] 1.4 增加或更新最窄 Gate tests，覆盖 policy/Records、empty/unavailable、selection/force、aggregate 与资源声明。

## Verification

- [x] 2.1 运行目标 repository-quality 与 definition tests、全树 Case check、materials validation、Decision check 和 Change check。
- [x] 2.2 对真实 corpus 再运行 adopted Gate lint，核对 advisory Finding/records/final data、empty/unavailable 边界和选中条件。
- [x] 2.3 运行 typecheck、lint、format 及完整 `bun run check -- --all`，审阅 diff 与 artifacts 后如实勾选任务。
