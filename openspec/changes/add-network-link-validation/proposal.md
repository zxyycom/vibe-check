> **核心句：**本 change 保留“在显式授权下安全、并行地验证已分类外部链接”的未来产品方向；HTTP 实现与结果细节必须在新基础落地后重新基线，当前不得实施。

## Why

Markdown 的确定性分类可以识别链接形态和本地目标，却不能判断外部 HTTP(S) 目标是否可达。Vibe Check 可以把联网检查作为可选的项目 Check，但隐式联网、无界并发、SSRF、凭据传播和临时网络故障误报都会让该能力本身成为风险。

## What Changes

- 新增 Network Link Check，只消费 `add-markdown-link-validation` 提供的外部链接分类结果，不建立第二个 Markdown parser 或链接分类 owner。
- 联网必须由 TypeScript Project Definition 中经过验证的声明式 policy 显式启用；发现链接、选择 gate 或加载 check catalog 都不能自动授权网络访问。
- 该 check 复用共享 Check task orchestration 的有界 slots、named resources 与单项失败隔离来安排并行工作，并产生 final `QualityRecord` 与 `CheckResult`；Core 与 scheduler 不解释 HTTP 领域语义，也不承诺 caller cancellation 或 task timeout。
- 实施必须满足 SSRF 防护、ambient credential 隔离和输出脱敏，并严格区分正常完成后得到的领域 `indeterminate` 与未正常完成的 execution failure。
- HTTP method/status、redirect、retry、request budget、cache、record fields、identity、comparison 与完整测试矩阵推迟到实现前安全审计。

## Capabilities

### New Capabilities

- `network-link-validation`: 在显式联网授权和安全边界内，对已分类的 HTTP(S) 外部链接执行有界验证。

## Impact

- 领域实现 owner 是 `src/product/**` 中的 Network Link Check 与私有安全 transport boundary；Markdown owner 继续独占解析与链接分类。
- 直接依赖 `establish-check-record-core`、`establish-check-task-orchestration`、`adopt-typescript-project-definition` 与 `add-markdown-link-validation` 的已实施契约。
- 不修改共享配置、fixture 主 spec 或产品代码，也不授权真实公共网络请求；`tasks.md` 1.1 完成前不得进入实现。
