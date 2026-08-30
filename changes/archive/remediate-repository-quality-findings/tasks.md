# Tasks

任务先完成无需决策的 owner-local 整改，再用新 Gate 证据收敛需要用户判断的最小剩余集合。

## Readiness

- [x] 0.1 固定最新成功 Gate 的 28 file、134 function 与 2 Markdown link Findings 基线。
- [x] 0.2 恢复编码规范与发布前处置决策，确认每条 Finding 必须整改或获得有证据的特定例外。
- [x] 0.3 划分互斥 owner 写入范围，并将扫描豁免、公共契约和调度语义变化排除在首批实施之外。

## Implementation

- [x] 1.1 修复两条失效 Markdown 链接，并完成文档验证。
- [x] 1.2 整理无需决策的脚本工具函数和文件指标热点，保持命令与投影协议不变。
- [x] 1.3 整理无需决策的 package Check 函数、文件与参数指标热点，保持公共行为和 Check evidence contract 不变。
- [x] 1.4 整理无需决策的 Project Run 与核心 Check 指标热点，保持调度、取消、结算、进度与诊断语义不变。
- [x] 1.5 按行为 owner 整理受影响测试场景，并保持 Case、Owner 与 Proves 证据闭合。
- [x] 1.6 从首批完成后的新 Records 形成逐项剩余清单，为每个候选给出继续整改或必要例外的证据。
- [x] 1.7 经用户确认后处理剩余的特定豁免：仅从 repository-private `schemas-examples` file-metrics 输入排除字节保持不变的 historical v2 run schema，并同步长期 Decision owner。

## Verification

- [x] 2.1 各分片最窄目标测试、文档投影检查、typecheck 和 lint 通过。
- [x] 2.2 测试正文变化前后的 `bun run test-evidence -- check --root .` 与相邻目标测试通过。
- [x] 2.3 `bun run decisions -- check` 与 Change Plan 门禁通过。
- [x] 2.4 `bun run verify:vibe-check-workspace:full` 通过，并审计新的 file/function/link Records。
- [x] 2.5 成功标准、单文件例外证据和稳定 owner 完成语义审阅；最终 full Gate Records 证明 repository-quality Findings 为零。
