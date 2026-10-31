# Design

通过共享领域范围与显式 invocation 投影实现局部指标扫描。

## Context

当前 Gate 单入口、exact candidate 和原生 flag 选择保持；scope 原本仅复用输入 region，指标拥有完整 codeAreas。参见 Project Gate 与 Gate repository quality owner。实施起点的 main 工作树与暂存区均无已有改动；当时的活动 Change 没有本目标。

## Goals / Non-Goals

目标是范围单一来源、局部实际扫描、完整模式覆盖不缩水和默认文档反馈。非目标是任意文件 selector、局部 TypeScript compiler、Product 领域模型、修改 blocking 策略或指标预算。

## Decisions

### Intended Change

- 领域表分别表达所属文件和测试 owner 根；变更依赖仍独立表达并引用领域表，不把触发输入当作扫描边界。
- 领域选择显式带入适用指标；通过原 codeArea 与领域文件的交集生成 exact patterns，保持同 area 下不同所选领域之间的重复比较。
- 完整、changed、focused 模式保留完整配置；显式指标 input scope 仍可强制该指标的完整范围。
- 默认基础 Markdown lint、两项链接检查保留完整引用图；lint 仍 non-blocking。

### Resulting Impacts

- bound Run 需把验证过的 selection 传给组装入口；保留 candidate import 边界。
- 指标阈值、排除与 waiver 留在指标 owner，不随领域表迁移。
- scope 的文件交集在真实工作树解析，失败不回退为全量或伪成功；exact patterns 必须正确转义 glob 字符。
- 新的选择和实际扫描契约需测试、Case、内部说明和独立反查。

## Risks / Trade-offs

局部结果不证明未选领域或与其之间的重复。默认文档检查增加工作量，不通过放宽性能预算掩盖；报告实际证据。源文件可能在组装后变化，scanner 原有读取和失败边界保持。

## Open Questions

无影响实施的未决问题。用户后续已授权整理本任务 Git 提交并全面扫描；当前 checkout 的普通提交包含既定限频 auto-push。仍未授权 Change finalize/delete，故保存已完成 Plan，不删除目录。

## Implementation Observations

- 首轮代表性 scoped Gate 已执行 14 项，捕获三处新增选择逻辑复杂度超限及隔离 root 不应引入的 remeda 启动依赖；以按职责分离验证及移除该依赖修复，不提高门限。
- 独立审查发现 artifact examples 受既有 **/artifacts/** 排除，永久没有指标输入；其 scope 保留材料验证，不自动追加空指标。补齐共享范围表对 Markdown lint 和所有 Product lane 的触发依赖。
