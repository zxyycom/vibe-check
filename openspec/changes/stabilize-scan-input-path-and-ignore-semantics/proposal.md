核心句：本 change 只在 `openspec/changes/stabilize-scan-input-path-and-ignore-semantics/` 下形成待审计临时计划，用于在实现前选择并稳定相对 `--changed-files` 输入路径基准与 fallback walker ignore 语义；它不影响现有其它文档或主规范。

## Why

当前相对 `--changed-files` 文件路径按进程启动目录读取，而文件中的 entries 作为 project paths 使用；同时，Git-first collection 尊重 VCS ignore，fallback walker 只应用 include、exclude 与 generated 规则。产品化 change 为保持 pinned 行为不能擅自收敛这些差异，因此需要一个独立 owner 在兼容性审计后明确合同，避免调用位置或 Git 可用性悄然改变 scan input。

## What Changes

- 审计并最终选择相对 `--changed-files` 文件路径的唯一基准（project root 或 launch cwd），随后要求 CLI 解析、错误呈现、文档和验证一致应用该选择。
- 审计并最终选择 fallback walker 的 ignore 级别（维持 best-effort fallback 或实现与 Git-first collection 的 ignore parity），随后要求 scan scope、失败边界、文档和验证一致应用该选择。
- 在选择完成前把两个问题保留为阻塞项；本 change 的 artifacts 完成只表示待审计临时计划已形成，不代表可以 apply。
- **可能 BREAKING（待审计）**：若最终选择不同于现有 launch-cwd 路径读取或无 VCS-ignore parity 的 fallback 行为，依赖现状的调用者或无 Git 环境中的扫描集合可能变化；兼容策略必须在审计门禁中确认。
- 不改变 metrics、warnings、report/artifact shape、summary status 或进程状态映射。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `cli-contract`：明确相对 `--changed-files` 输入文件路径必须基于经审计选定的唯一上下文解析，并在所有正式与 dogfood 入口一致。
- `scan-scope`：明确 Git-first 与 fallback collection 的 ignore 合同必须采用经审计选定的兼容级别，并在对应收集路径一致执行。

## Impact

- 预期后续实现影响 TypeScript/Bun CLI 参数归一化、changed-files 输入读取、scan scope Git-first/fallback collection 及其定向测试。
- 预期后续同步现有 CLI 与 scan scope owner 文档；不新建同义 capability。
- 不引入新的 metrics、warning、artifact、status 或 output contract，也不在本提案阶段修改代码、主规范、文档或其它 change。
