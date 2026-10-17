# Proposal

合并严格 JSON AST 的查重与安全值投影，为整轮 Gate / runtime 成本优化减少重复工作。

## Why

完整 Gate 的 43 项成本清单已建立。严格 JSON 基线在完整 Momoa grammar 验收后分别遍历 AST 检查 decoded duplicate keys
与构造深冻结值；材料 CLI、JSON Check 和 schema consumers 共同支付这部分成本。
来源与当前 baseline 在 ignored `tmp/all-cost-optimization-20261014/README.md`。

## Outcome

每个已完成 grammar 验收的 AST 只做一次查重/值投影；JSON Check 顺序扫描在文档边界让出事件循环。
保持原理由优先级、读取边界、深冻结 null-prototype 值及公开结果，让 timer/I/O 取消及时被观察。
局部语义与成本证据作为整轮验收的一部分，不以这一项完成代替整个 Gate / Scheduler 优化交付。

## Scope

### Intended Change

在 `src/package-checks/json-document/strict-document.ts` 合并纯投影过程；对象以自身已构造字段判断重复，
Array/Object 遇到重复返回内部封闭信号，完整 grammar 仍先由 Momoa 检查。
JSON Check 每个文档前 await `node:timers/promises` 的 `setImmediate`，保持文件顺序和取消结算边界。

### Resulting Impacts

既有 strict-document 实体补强 nested/escaped/特殊 key、grammar 优先级和 descriptor 断言；目的和实体身份连续。
同步 JSON 指南的协作让步边界与原取消实体/Case；Check final data、records、schema consumers、fresh bounded read 和依赖保持。

## Success Criteria

1. 原 byte/BOM/UTF-8/grammar/duplicate 顺序、private value 形状/冻结、Infinity numeric overflow 和 unavailable 映射保持。
2. 独立旧源码对照覆盖真实 docs JSON 与确定性 grammar/duplicate corpus；目标测试和完整 Case 闭合通过。
3. 同输入局部成本复测支持采用；工程、独立规范审查及整轮组合 Gate 完成。

## Affected Owners

- `docs/checks/json-validation.md#工作原理`：同步协作让步说明；JSON/schema consumers 的结果与安全契约保持。
- `docs/testing/cases/warning-generation.md`、测试策略与 Case 维护：原证明目的。
- 编码规范、性能优化规则与整轮 Gate owner：质量和共同验收。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](../complete-gate-and-static-frontier-cost-optimization/evidence/historical-acceptance.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
