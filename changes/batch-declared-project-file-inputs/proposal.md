# Proposal

本 Draft 保存对调用级声明式项目文件批处理的评估；当前处置是保持按需收集，不进入 Plan。

## Why

该方向原本希望减少多个 Check 对同一项目文件来源的重复获取，并为一次 Run 提供共同的路径成员时间切面。复审确认，现有 Check 已在各自边界内批量处理多个 selections，剩余的跨 Check 收益尚无可复现的真实瓶颈证据。

实现该方向需要同时扩展公开 Check 声明、Definition identity、Run barrier、失败与取消结算、Core owner 和随包 constructor 一致性。相较当前已观察到的收益，这些长期设计成本以及最终 authoring 用法都不够合算。

长期取舍由 [`retain-on-demand-project-file-collection`](../../docs/decisions/retain-on-demand-project-file-collection.md) 承接。

## Outcome

本 Draft 不产生产品行为、公共契约或 owner 迁移。项目继续使用同步单次 `collectProjectFiles(...)` 和各 owning Check 内的批量收集；只有真实 workload 证明显著瓶颈，或出现共享调用级路径时间切面的独立消费者时，才以新的 Change 重新评估最小方案。
