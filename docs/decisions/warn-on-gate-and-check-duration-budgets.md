---
title: 以留有余量的 Gate 与 Check 分布预算告警
id: 260926-warn-on-gate-and-check-duration-budgets
status: active
alignment: aligned
createdAt: 2026-09-26T10:43:41Z
purpose: 保持多数 Check 轻量并观察总反馈时间，不让环境波动阻断正确性验收
background: 固定总耗时硬阻断混淆反馈体验与单项架构成本，用户授权先验预算并要求余量
decision: 按显式总耗时、Check 均值与 P95 预算告警；保留无效配置和测量的失败边界
tags:
  - configuration
  - performance
  - workflow-policy
relations:
  - type: 修订
    target: 260926-apply-gate-time-budgets-without-fingerprint-gating
    summary: 总耗时超标改为警告并增加带余量的均值与P95预算
---

## 目的

- 用先验预算持续约束多数 Check 的轻量化，并区分单项变重、数量累积和整体反馈等待。
- 给正常环境波动留余量，不再让仅性能超标覆盖正确性验收结果；保留无效配置、无效测量和真实失败的边界。

## 背景

- 前序移除了声明指纹失配阻断，但保留 required / all 的本机总耗时硬上限。同样通过的 Check 仍会因单次超预算而使 Gate 失败，总耗时也不能单独说明是任务数量还是单项成本过高。
- 用户要求总耗时先降级为警告，同时通过均值与 P90/P95 表达“大部分轻量、极少数较重”的架构要求；随后授权 agent 决定留有余量的预算。预算由设计目标先行确定，运行数据用于评价达标与定位，不等待足够历史样本才制定规则。
- 当前 Product 已提供同次 Run 的 execution duration；公开值不包含排队和 Check preparation。Gate 可以直接投影，不需要新建历史测量系统、改动调度器或读取诊断日志作为事实源。

## 决策

- 采用: required / all 的总耗时、Check 平均执行时间与 P95 均为告警预算。等于预算视为达标，超标输出 warning 并保留初步 passed / exit 0；实际 Check 失败、配置缺失或无效、不可用 Run 和计时错误仍按既有失败边界处理。focused preset 不评估性能预算，初步非 passed 不因性能检查得到提升。
- 采用: 本次本机 required 为 30000ms、all 为 90000ms；两个 profile 的 Check 均值为 2000ms、P95 为 5000ms。选择半分钟级日常反馈、分钟级完整验收和秒级单项成本，为进程启动、I/O 与并发竞争留余量，而不是拟合现有成绩或承诺必达。未来调整仍由维护者作出明确设计判断，不自动回归、学习或上调预算。
- 采用: 继续由被 Git 忽略的本机 schemaVersion 1 文件按 profile/runtime 唯一配置，`maxElapsedMs` 必填；新增可选 `maxMeanCheckMs`、`maxP95CheckMs`，省略时分别使用明确默认值 2000、5000，显式非法值不得回退。三个字段均为正 safe integer。Gate 只规范化读取、不回写配置；总耗时不增加隐式默认。runtime、普通文件、唯一性与 unknown-key 校验继续有效，旧指纹仅作合法可选元数据。
- 采用: 只计算同次 `RunResult.checkDurations` 中非 null 的 execution，真实零值参与；均值为累计值除以数量，P95 为升序第 ceil(0.95 × N) 项，不插值且不要求历史样本。小于 20 项时 P95 等于最大值；空集合显示 n/a、不评估 Check 预算，总耗时仍评估。重复身份、非法 duration 或累计溢出使测量无效，不伪造统计。
- 采用: 每次有效评估分别报告总耗时及三个准备/运行阶段、执行数量、累计 execution、均值和 P95 的预算对照、最慢三项。Check 预算独立比较；累计 execution 不称作墙钟或 CPU 时间。分布合格而总耗时超标时，可继续调查数量、编排和准备成本，不能只凭单个指标自动判定原因。
- 采用: Check 粒度继续由行为 owner 和独立验收责任决定，不通过拆分、合并、跳过或把工作移到 preparation 改善指标。只在 Gate 私有评估层投影预算，不新增 Product API、Check outcome、Record 或 machine schema，也不改变调度、测试选择和取消语义。
- 采用: `definition.ts` 仍配置唯一 resultContributor；它消费 frozen 初步结果和 context，只追加闭合的 `{blocks,messages}`。性能超标返回非阻断贡献，adapter 的受限 passed→failed、异常 fail-closed 和唯一最终退出映射不变，不改写 Product facts 或 aggregate。info 保留在 Gate transcript，warning 同时在终端可见。
- 采用: 保留 exact candidate 入口、candidate preparation 前的配置预检、help 无准备/日志副作用、receipt exact artifact 及只执行一次 preparation/load/Run 的边界。初步结果仍依据 Product default aggregate，adapter 不遍历 snapshot 重建它。当前精确字段、计时口径和运维说明由 [Gate owner](../tooling/project-gate.md#性能预算与-check-耗时分布) 拥有。
