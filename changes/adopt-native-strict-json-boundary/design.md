# Design

在统一私有文档边界实现原生语法验收、解码键查重和安全值处理，记录本次集成与验收。

## Context

基线为 `8c39f3098e23a525ecc7472d71ecfde551331ad6`，工作区开始时干净。
`jsonValidation` 消费文档 verdict；Schema 的本地 schema、instance 与受控远端引用消费同一边界的私有值。
长期取舍由[采用决定](../../docs/decisions/use-native-json-with-private-duplicate-scan.md)承接；本页拥有本次实施与证据。

## Goals / Non-Goals

降低解析路径成本并移除 Momoa，维持统一文档结果、公开类型、Records、计数和错误优先级。
原生解析器拥有完整语法，自有扫描器只处理合法原文；公开能力、文件/网络授权、Gate 并发、资源和预算保持不变。

## Decisions

### Intended Change

1. 既有受限 fresh read、BOM 和 fatal UTF-8 先执行；`JSON.parse` 对完整原文验收语法。
2. 只对语法已成功的同一原文扫描字符串和容器；每个对象独立记录解码键，数组只维护层级。
   原生解析器解码转义键，普通键直接取字符串内容；不做 Unicode 规范化或大小写折叠。
3. 原生解析成功的新值只在私有 owner 内以显式栈将 JSON 对象原型设为 `null`，并冻结全部容器；数组保留数组原型。
   任何内部执行失败归一化为 unavailable，临时值和 parser 错误不公开。

### Resulting Impacts

JSON 与所有 Schema 文档消费者保持统一行为；测试覆盖原文重复证据，而非对解析后的对象倒推。
root manifest、lockfile、release manifest 和 artifact 独立 literal 同步移除依赖。
原调查资源保真；旧决定归档后普通链接修复到其历史位置。
公开指南说明重复键语义与结果边界，源码和采用决定承接内部算法与取舍；Case 继续映射现有证明目的。

## Risks / Trade-offs

扫描器虽不验收 grammar，仍承担字符串边界、容器归属与键集合的正确性；需确定性生成样本和独立预期。
原生解析先形成私有值再扫描原文，会保留第二次扫描成本；采用依据是组合测量而非裸 JSON.parse。
深层输入的实现容量可能优于旧递归 AST 转换，不将宿主栈阈值固化为公开深度保证。

## Open Questions

无。本次复审已完成；按用户授权，Gate 重项性能优化另作独立单元，与本单元整体验收后提交。

## Implementation Observations

### 行为与消费者

- 最终源码在 Bun 1.3.14、Node 24.18.0 下各对照 3,547 项字节输入，包含确定性生成、真实文档与五类负载，
  与旧实现零差异；独立预期核对重复键、语法优先、BOM/UTF-8、负零和溢出，并遍历冻结值的 descriptors/prototype。
  1,024/4,096/16,384 层数组均成功；旧实现最后一档为 unavailable，此为容量观察，不新增公开深度保证。
- JSON、Schema、strict-document 与 artifact 目标测试通过：32 项、10 文件。独立 reviewer 反查实际 diff、
  完整编码规范及文档影响，无阻断；其 Case 注册闭合实际通过 725 entities / 181 Cases / 15 topics。

### 性能测量

使用原调查冻结的 449 文档 / 31,434,902 bytes 与四类合成输入；旧源码取自本 Change 基线。
两阶段顺序测量，每宿主/负载 5 个独立进程、各一次预热和一次计时。下表为采用时实现的墙钟中位数（ms）；
提交前代码复审仅调整私有函数命名和类型说明，测量路径的算法保持不变。

| 完整工作 | Bun 替换前 → 后 | Node 替换前 → 后 |
| --- | --- | --- |
| bytes → 安全值：449 文档 | 1246.7 → 406.1 | 751.3 → 203.3 |
| bytes → 安全值：宽键对象 | 73.4 → 18.9 | 40.1 → 22.2 |
| bytes → 安全值：数值数组 | 206.6 → 142.1 | 54.4 → 11.8 |
| bytes → 安全值：转义字符串 | 45.6 → 23.7 | 36.6 → 8.5 |
| bytes → verdict：末尾重复键 | 77.5 → 15.7 | 41.7 → 16.4 |
| 公开 JSON Check：449 文档 | 1345.1 → 506.7 | 899.7 → 219.8 |

公开 Check 包含 selection、受限 fresh read、yield、完整处理与结算，计时从工作开始至结算完成；每轮均为 449 valid / 0 issues。
CPU 中位数各组下降；RSS 表示整个 worker 的进程高水位。结论限于同输入的组合路径及五样本中位数，
顺序测量仍可能受环境漂移影响，Gate 时长和深度容量分别由相应验收说明。
可删除的原始数据、源码身份和对照脚本在忽略目录 `tmp/native-json-adoption-20261015/`，不进入生产依赖或历史调查资源。

### Gate 与工程验收

初验 candidate 为 `0.0.0-local.6c8227608951`，提交前复审 candidate 为 `0.0.0-local.374b9bf8c9ce`。
完整 Gate 包含 artifact 与 isolated consumer types/runtime/docs 验收。

| 验收范围 | 结果 | 总反馈 / ms | Check 均值 / ms | Check P95 / ms |
| --- | --- | --- | --- | --- |
| 初验完整 `--all` | 43 passed | 50,284.7 | 1,914.2 | 4,829.8 |
| 初验隔离增量 required | 38 passed，5 按条件未选择 | 25,748.3 | 1,710.2 | 4,422.5 |
| 复审完整 `--all` 第 1 轮 | 43 passed | 57,529.5 | 2,649.2 | 6,937.1 |
| 复审完整 `--all` 第 2 轮 | 43 passed | 34,434.1 | 1,962.6 | 6,707.9 |

初验满足既有完整 90s、增量 30s、均值 2s、P95 5s 预算；初验完整轮含候选准备 17,198.2ms。
复审两轮总时长达标，第 1 轮均值及两轮 P95 超预算；最慢集合涉及消费者类型验收、产物验收、函数指标及 Workbench 测试。
解析器替换单元未修改这些 owner 的实现，测量也尚未证明波动原因；后续优化由独立性能 Change 承接。
另一次与治理命令重叠的增量轮功能全过、P95 为 6,653.6ms；原始日志保留，原因尚未归定，达标轮也只证明本轮分布。
并发、资源声明和预算文件均未修改，没有新增 waiver。

工程 lint/typecheck/format、依赖边界、公开材料、文档链接、Case、Decision、Change 和 Investigation 检查通过。
采用决定在完整验收后标记 aligned；Change 保留待单独结项，复审进度见 [tasks](tasks.md)。


## Historical evidence handoff

2026-10-17 生命周期核对：本页已独立保存该轮输入条件、关键计数/样本、混合方向与未验证边界；
所述 `tmp/` 或旧 `.log/` 路径只保留历史来源意义，不是当前运行依赖、永久保留义务或仍可执行的复核入口。
一次性源码镜像、profile、草稿与工程日志不继续保存；本次未新增采样或产品验收。
