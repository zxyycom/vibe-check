> **核心句：**本 change 保留“为项目选择的普通 JSON 提供严格、可定位校验”的未来产品方向；具体契约必须在 Check/Record Core 与 TypeScript Project Definition 落地后重新基线，当前不得实施。

## Why

项目中的 manifest、配置和数据文件经常因 JSON 语法或结构问题在下游工具中才失败。Vibe Check 应提供开箱即用的 JSON 检查，让这类问题进入统一的 Check 与 Record 结果，而不是要求用户为每个项目重复包装脚本。

## What Changes

- 新增由 JSON 领域 owner 负责的内置 Check，对 Project Definition 选择的普通 JSON 输入执行严格解析，并报告可定位的语法与结构问题。
- JSON Check 直接产生 final `QualityRecord` 与 `CheckResult`；Check/Record Core 只验证和汇集公共契约，不理解 JSON、parser 或领域规则。
- 输入选择与用户政策通过落地后的 TypeScript Project Definition 表达；本 change 不再预设旧配置字段、覆盖语法或固定运行模式。
- parser、资源预算、record type、identity、比较、缓存和测试矩阵推迟到实现前审计，届时必须按实际基础契约重新设计。

## Capabilities

### New Capabilities

- `json-validation`: 对明确选择的普通 JSON 输入提供严格解析、可定位问题和独立 Check 结果。

## Impact

- 领域实现 owner 是 `src/product/**` 中的 JSON Check 与其私有解析边界；共享 Core 不新增 JSON 分支。
- 直接依赖 `establish-check-record-core` 与 `adopt-typescript-project-definition` 的已实施契约。
- 不修改主 specs、现有配置或产品代码；`tasks.md` 1.1 完成前不得进入实现。
