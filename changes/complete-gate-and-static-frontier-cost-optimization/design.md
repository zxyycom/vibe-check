# Design

通过复用授权解析事实、消费有序 group-head 前缀及按责任分层进程工作减少重复成本，保持完整验收与策略。

## Context

基线 HEAD 为 `0fe55d31ecb11eadf4999b534a0767d08d68bd90`，先前自有 fixture 与 JSON 切面保留。
成本 inventory、输入 manifest 与原始样本保存在 ignored `tmp/all-cost-optimization-20261014/`；它们只供本轮复核。
原 static query 每次枚举 G 个组，unique mutex/resource 的 G=N workload 已暴露增长成本。

## Goals / Non-Goals

覆盖完整成本链路并降低已证实的重复工作；保留 owner、兼容性、输出与验收。
不提高质量阈值、裁剪测试、移除 DOM consumer 覆盖、改变 learned policy 或引入依赖。

## Decisions

### Intended Change

Gate 使用 Git 忽略、可删除的 `.cache/vibe-check/markdown-link-parse-facts/`；用户已授权其中的 source-derived material。
Scheduler 编译全局 ordinary/constrained ranks，沿现有 immutable Task queue 为三层维护 group heads；
relation 只更新受影响组，scope active-root 实际变化只更新所属组。
用户再次确认全部并发设置保持；继续处理 supporting Check tests 的动作必要性。
七个 retry variant 的独立责任位于 GitCommandResult 后的解析、prefix、重试与 assessment，
由实例私有 typed runner 提供原始 stdout/failed，真实 production 入口仍默认 runGit。
workbench entry 先关闭参数、scenario 形状与 policy registry，再 await execution module；真实 replicate workflow 机械迁移，
先验输入拒绝不支付 Product/policy/simulate 装载。通过先验验收后的装载失败沿既有 mapper 返回结构 error 与退出 `1`。

### Resulting Impacts

group revision 标识 head/layer 的当前 entry，防止被更高优先级暂时替换的旧 head 复活或重复。
动态 mutex/capacity 仍由原 query owner 判断；constrained 等待不回填，ordinary 先选 admissible。
同步原实体/Case、内部职责与 Gate cache 维护边界，并对当前 candidate 运行全套验收。
保留原七组输入/预期、实际 reducer/parser/messages 与精确重试次数；一组失败→恢复仍走真实 transport 与完整 Run。
相邻两次 Run 复用/取消、真实 Git 历史、progress 和 machine publication tests 保留，不新增 public injection 或 global mock。
原 CLI 矩阵不减；复制真实 bootstrap 闭包并省去 execution module，分别证明非法输入先拒绝与有效输入装载失败被包含。

## Risks / Trade-offs

全局队列增加编译与 persistent 更新常数成本，换取异构可运行前缀不枚举全部组。
动态阻塞前缀仍需判断；不把局部增长改善扩写为 universal Scheduler 上界。
缓存冷态增加 publication，源读取与目标安全工作保留；容量管理由维护者拥有。

## Open Questions

无当前行为或权限决策阻塞。DOM 编译选项裁剪未显示稳定收益，已拒绝；调度策略与资源预算保留原值。
本轮保留 Momoa。解析器替换可单独评估，采用前另行讨论，不属于当前实施范围。

## 验收证据

全部 43 项成本已按 owner 分类，当前 diff、Case 与文档由非实施代理独立反查。
最新实现完整 Gate 为 43/43，artifact 与 external consumer 绑定同一候选包，2504 项源清单前后匹配。
原始记录在 `.log/project-gate/2026-10-14T09-53-08.975Z-2918519-e1ac405d-d2d3-47a3-a592-22485eb6667f/`；
该次 wall 35.88 秒只是观察值，mean 2194.9 ms / P95 4781.0 ms 按原预算记录，不作为整体因果加速结论。
