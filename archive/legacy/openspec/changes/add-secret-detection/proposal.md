> **核心句：**本 change 保留“在项目批准的内容中检测疑似秘密并只发布脱敏结果”的未来产品方向；检测规则与公共契约必须在新基础落地后重新基线，当前不得实施。

## Why

Vibe-coding 项目容易把访问令牌、私钥或其它凭据误写进源码、文档和配置。Vibe Check 应提供开箱即用的秘密检测，并让用户在统一 Check/Record 输出中定位和处置风险，同时保证检查本身不会再次泄露秘密。

## What Changes

- 新增 Secret Detection Check，对 Project Definition 批准的项目内容执行领域检测，并产生 final `QualityRecord` 与 `CheckResult`。
- 原始疑似秘密材料只能存在于受限的调用期内存；公开 record、diagnostic、artifact 与人读输出必须使用不可逆的安全表示。
- 已提交 final records 与 CheckRun 执行/覆盖状态保持独立；后续执行失败不得撤销已提交记录，也不得把未完成工作伪装成完整检查。
- detector 组合、规则集、allow/suppression authoring、record fields、identity、比较、缓存和测试矩阵推迟到实现前安全审计。

## Capabilities

### New Capabilities

- `secret-detection`: 对批准的项目内容检测疑似秘密，并提供可定位、可处置且不暴露原始秘密的结果。

## Impact

- 领域实现 owner 是 `src/product/**` 中的 Secret Detection Check 与私有 detector boundary；共享 Core 不解释秘密类型或置信规则。
- 直接依赖 `establish-check-record-core` 与 `adopt-typescript-project-definition` 的已实施契约；若采用并行任务，必须复用 `establish-check-task-orchestration` 而非建立 feature-local scheduler。
- 不修改共享配置、scanner dependency、fixture 主 spec 或产品代码；`tasks.md` 1.1 完成前不得进入实现。
