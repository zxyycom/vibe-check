# Proposal

用测试自有的 TypeScript 环境减少 Core 闭包 fixture 的无关宿主声明工作，保持原证明范围。

## Why

该切面的 Core 闭包测试隔离基线 process-wall median 为 5.04 秒，完整 Gate 三次均通过但 Check 时长告警仍在。
小型 fixture 的一次边界校验读取 68 个 Node 类型文件，而 fixture 的 Core 合约只使用基础 TypeScript 类型和 Promise。
当前测量来源与源身份保存在 ignored `tmp/gate-heavy-tests-20261014/README.md`。

## Outcome

在原测试实体、边界矩阵和真实 TypeScript no-emit 证明保持连续的前提下，减少 fixture 加载无关宿主声明的成本；
用当前版本的同 workload 复测验证收益，区分局部收益与完整 Gate 观察。

## Scope

### Intended Change

只在 `scripts/validation` 的合约 fixture 与 alias 变体中声明 ESNext / 无自动 host types 的编译环境，
保留原有效/违规矩阵并加入真实 Core 类型错误的 no-emit 拒绝信号。

### Resulting Impacts

同步原 `AUX-REPOSITORY-LAYOUT-001` 的证明描述；在本 Change 保存当前 source identity、同命令测量与验收边界。
真实 validator、Product、公开指南、Gate 配置与质量门槛不变。

## Success Criteria

1. 原有效符号、alias、callback、literal dynamic import 与 19 行违规矩阵全部保留；no-emit 接受有效 Core 并拒绝实际类型错误。
2. 完整实体/Case 闭合和 scripts 类型、lint、精确路径格式及材料校验通过。
3. 同一隔离命令的 wall / child CPU 复测支持采用；完整 Gate 保持 43/43，时长仅按实际样本解释，不增 timing 门禁。
4. 独立代理从实际 diff 反查证明连续性、完整编码规范与文档影响；按当前任务授权整理提交，保留 Change。

## Affected Owners

- `docs/tooling/workspace.md#package-tools-依赖边界`：真实校验规则，仅核对不修改。
- `docs/development/coding-style.md`、测试策略、Case 维护：实现与证据要求。
- `docs/testing/cases/repository-tooling.md`：原 Case 的 no-emit 证明信号。
- `docs/tooling/project-gate.md`：lane 配置与实际运行边界，仅核对不修改。
