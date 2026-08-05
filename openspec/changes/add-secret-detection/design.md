> **核心句：**本 design 只固定 Secret Detection Check 的安全生命周期、结果边界和 owner，不提前承诺检测算法或公开字段。

## Context

秘密检测必须读取潜在敏感内容才能判断风险，但任何把原始命中写入records、日志、cache或测试输出的设计都会制造二次泄露。新的Check/Record foundation允许记录提交与运行完整性分别表达，TypeScript Project Definition则负责选择check及其声明式政策。

## Goals / Non-Goals

**Goals:**

- 在项目批准的内容范围内发现具有行动价值的疑似秘密。
- 保证原始秘密材料只在受限调用期内存中存在，所有公开和持久结果均脱敏。
- 保留已提交 records，同时让 CheckRun 如实表达未完成覆盖或执行失败。
- 让 Secret Detection owner 独占 detector 与领域判断，Core 仅管理通用结果。

**Non-Goals:**

- 不在当前阶段固定具体 token patterns、entropy 阈值、置信度、severity、allowlist shape 或 fingerprint 算法。
- 不承诺扫描 Git history、远程 secret manager、自动吊销凭据或自动修改源文件。
- 不建立 Secret 专用输出、cache、配置合并或调度系统。

## Decisions

### Decision 1: Raw secret material has an invocation-only lifetime

Detector 可以在执行所必需的最小内存范围内查看原始候选，但 raw value 不得进入 QualityRecord、CheckResult、CheckRun diagnostic、artifact、cache、log或人读输出。安全显示和稳定identity的具体方案必须在实现前接受泄露与可猜测性审查。

### Decision 2: Secret Detection owns all domain classification

Secret Detection Check 判断哪些候选构成疑似秘密、如何归一化安全上下文以及输出何种 final records。Core 不根据内容、message或detector metadata重新决定level、warning或blocking含义。

### Decision 3: Record commitment and execution coverage remain independent

每条通过公共契约验证的final record可以即时保留。后续文件读取、detector或task失败由CheckRun诚实表达，并保留已经完成的领域证据；feature不得实现whole-result discard或自行改写共享coverage语义。

### Decision 4: Detector and policy details are implementation-time work

规则来源、误报控制、文本输入边界、binary/size处理、suppression authoring、identity和测试corpus取决于实现时的风险评估与依赖证据。当前change只固定安全结果，不把未经验证的候选规则写成长久契约。

## Risks / Trade-offs

- 脱敏过强会降低可处置性，脱敏不足会泄露凭据；实现前必须以“能定位但不能恢复或猜测秘密”为验收目标。
- 同进程执行无法提供真正的数据隔离；实现必须明确权限边界，并尽量缩短敏感值生命周期。
- Detector误报与漏报不可避免；实施时应从有证据的最小规则集开始，而不是承诺规则全集。

## Open Questions

当前没有需要提前决定的产品方向问题。detector、suppression 与安全 identity 方案均有意留待实现前阻塞审计，不能据此开始实现。
