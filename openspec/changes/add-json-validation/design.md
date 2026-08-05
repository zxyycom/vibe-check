> **核心句：**本 design 只固定 JSON Check 的产品责任和实现边界，不固定尚无实施依据的字段、算法或集成细节。

## Context

Vibe Check 正在从固定扫描 pipeline 转向独立的 Check 与 Record 核心，并计划以 TypeScript Project Definition 组合内置和自定义 checks。JSON validation 是该模型上的一个未来内置领域 check，而不是 Core 的一种特殊数据类型。

## Goals / Non-Goals

**Goals:**

- 让项目能选择普通 JSON 输入，并得到严格、可定位的语法与结构校验结果。
- 保持 JSON 领域判断、解析实现和诊断归一化由同一 feature owner 负责。
- 只通过 foundation 的 final `QualityRecord` 与 `CheckResult` 接入统一输出和决策。

**Non-Goals:**

- 不提供 JSON formatting、canonicalization、自动修复或 JSON Schema 校验。
- 不替代 Vibe Check 自身 Project Definition 的加载和运行时校验 owner。
- 不在当前阶段固定 parser dependency、配置字段、record schema、比较、缓存或完整测试矩阵。

## Decisions

### Decision 1: JSON semantics remain outside Core

JSON Check 拥有输入解释、严格解析、领域问题判定和安全诊断。Core 只管理 CheckRun、CheckResult 与 QualityRecord 的通用生命周期，不依据 JSON 内容重新分类或决定 level。

### Decision 2: Selection comes from the resolved Project Definition

Project Definition 决定是否启用该 check 以及向它提供哪些项目输入。JSON Check 不自行遍历项目，也不通过扩展名猜测扩大已解析的项目范围。具体 declaration shape 留待实现前与已落地 Project Definition 对齐。

### Decision 3: Content defects and execution failures remain distinguishable

非法 JSON 或受支持的确定性结构问题是领域结果；无法读取输入、解析边界崩溃或结果不符合公共契约是执行失败。Check 可以提交零到多条 final records，并独立返回最终 CheckResult。

### Decision 4: Implementation detail is intentionally deferred

具体 parser、结构规则、资源限制、record fields、identity、排序、比较、缓存和测试用例只有在本 change 被排入实施且前置 contracts 已落地后才能确定。当前 artifact 不作为可直接编码的详细设计。

## Risks / Trade-offs

- 严格 JSON 与项目实际使用的 JSON-like 格式可能不同；实现前必须明确输入分类，避免把 JSONC 等格式误报为损坏。
- 精确位置与安全资源上限可能约束 parser 选择；实现审计应以可观察结果和维护成本选择最小方案。

## Open Questions

当前没有需要提前决定的产品方向问题。parser、结构规则和公开 record 契约均有意留待实现前审计，不应据此开始实现。
