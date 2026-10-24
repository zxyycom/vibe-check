---
title: "交付验收中 duplicate-detection lane 的超时与隔离复核"
id: "261024-record-delivery-duplicate-lane-timeout"
formedAt: "2026-10-24T04:56:32Z"
question: "完整 Gate 中的五秒测试超时与一次隔离通过分别证明什么，尚有哪些验收风险未解决？"
tags:
  - "project-gate"
  - "test-execution"
  - "timing"
relations:
  - type: "补充"
    target: "261024-measure-gate-test-boundary-simplification"
    summary: "补充后续交付的测试超时和单次隔离复核边界"
---

## 形成时背景

2026-10-24，测试边界简化已提交为 `f998ed4c4647194bbd602c8fc57b1a27130ee427`，
随后进行文档 AI 可读性与编码规范审查。交付时先运行 changed，再按 candidate owner 要求运行 all；
changed 功能通过但被性能预算阻断，all 则出现 duplicate-detection 行为测试 lane 失败。
该现场涉及真实外部进程、五秒测试限额及后续测试注册异常，按项目自动调查沉淀规则保存，根因尚未确认。

[前序测试边界测量](./measure-gate-test-boundary-simplification.md)的 V2 曾有 41 项功能通过、性能仍失败。
本轮是之后审查收尾条件下的新验收现场，补充稳定性风险，不改写前序 V2，也不将两轮当作同输入 A/B。

## 调查目的

保存完整 Gate 失败、一次隔离复核及其来源，区分测试超时、后续错误现象和 Gate 性能阻断。
本报告交接未解决的验收风险，不选择修复方案或授权重测、放宽 timeout / budget。

## 调查范围与依据

### 版本与实际动作

- 测量时 HEAD 为 `f998ed4c`；文档、Case 与 Change 有审查收尾改动。
  当时未提交的源码改动仅为 `scripts/package/candidate/prepare.ts` 的私有类型更名，以及
  `external-consumer/preparation-diagnostics.ts` 的事件联合和安装摘要类型。
  独立审查以本地 TypeScript transpile 核对，两文件相对 HEAD 的 ESNext 运行时代码输出相同；这不是性能对照。
- `git diff d15cbf6f -- src/package-checks/duplicate-detection` 为空，覆盖该模块源码、测试与 helper；
  这只说明该目录未改，不证明其它输入、缓存、进程或执行环境相同。
- 两次 Gate 使用 Bun 1.3.14 与 candidate `0.0.0-local.883a39af14a7`，tarball SHA-256 为
  `a20bdf2e3c09035d98fd9a22c2625196611af3c20880229606873b426af26932`。
  changed 的 preparation 为 rebuild / receipt-input-mismatch；没有把它当作纯 Run 计时。
- all 结束后，主执行代理只对原同组六文件隔离执行一次 `mise exec -- bun test <六文件>`，实际 Bun 1.3.14。
  本报告整理阶段只读现场，没有再跑 Gate、测试或性能测量。

六文件均位于 `src/package-checks/duplicate-detection/`，按原顺序为：
`constructor.test.ts`、`finding-waivers.test.ts`、`cache/store.test.ts`、
`jscpd/scanner.measurement.test.ts`、`jscpd/scanner.test.ts`、`jscpd/parser.test.ts`。

### 证据来源与计时边界

Gate 原始日志分别位于 ignored `.log/project-gate/` 下：

- changed：`2026-10-24T04-51-31.030Z-942589-ccc82a5f-e598-4090-82cd-62c0228f3cee/`。
- all：`2026-10-24T04-52-52.246Z-950813-5af4c907-8ce6-482a-a3f8-057c8502a938/`。

报告作者直接读取两轮 `gate.log`、`progress.log` 与 all 的失败 lane transcript。
随附资源仅原样复制该失败 transcript，不复制整套日志；复制前后 SHA-256 均为
`5190b8bb13445eee53092ace1079467b0cc08655686ed2561bf03017d18508df`，用于复核错误顺序和 runner 原文。
附件保留原始 code-frame 空行的行尾空格；它是原样日志证据，不作为待格式化源码。
隔离运行的数据来自主执行代理当次工具输出，未保存 raw 文件；下表明确区分来源，不补造日志。
本轮没有同期 CPU、内存或调度压力采样，不能从前序资源数据推定本次负载原因。

## 调查结果与边界

### Gate 与隔离复核是三个不同结论

| 执行与来源 | 结果 | 时间与判断 |
| --- | --- | --- |
| changed，Gate 原日志 | 39 passed / 4 not-applicable；exit 1 | elapsed-to-initial 74,824.9 ms、mean 3,582.0 ms、P95 12,846.2 ms，分别超过 30,000 / 2,000 / 5,000 ms 预算。duplicate 行为 lane 本轮通过。 |
| all，Gate 原日志 | 40 passed / 1 failed / 2 not-applicable；exit 1 | 执行摘要 elapsed 62.5 s；唯一失败 Check 为 `tests-product-duplicate-detection`。初步结果失败，性能预算未评估。 |
| 原六文件隔离一次，主执行代理工具输出 | 19 passed / 0 failed | Bun 自报总时长 8.86 s；三个构造测试依次为 4,884.02 / 280.01 / 771.72 ms。不是完整 Gate 耗时或重复测量分布。 |

all 的 `project-gate-performance-not-evaluated` 与
`scripts/project/gate/runtime/performance-observation.ts` 的初步结果 guard 一致。
因此不能把这次 all 写成性能达标，也不能给它补算一次正式预算结论。

### 失败 transcript 的可观察顺序

1. 首个构造测试 `executes duplicate detection from Check-owned scanner options with final data and Check-owned cache options`
   报告 **5,003.40 ms**，runner 明确说明超过 **5,000 ms** timeout；transcript 还记录 `killed 1 dangling process`。
2. 随后出现 `assertSelfMatchedFragmentIsRejected` 的断言差异：预期 `external-result-invalid`，
   实际 `external-execution-failed`；runner 又将下一构造测试标为失败。
3. 其余五文件加载时依次出现 `describe() inside another test()` 的 Bun `node:test` 错误。
   runner 最终汇总为 1 pass / 7 fail / 5 errors，涉及六文件；这与 Gate 的“一项 Check 失败”是不同层级。

这些是同一日志中的顺序与现象，尚未证明后续断言和注册错误全部由首个超时引起，
也未定位外部进程失败的直接原因。隔离运行首测试距五秒限额不足 0.12 秒；单次通过只说明该次执行完成，
不能证明测试稳定、负载是根因，或已修复时序串扰。

### 未解决风险与后续边界

当前可交接结论是：**changed 性能失败，all 有真实测试失败，完整交付验收尚未通过。**
本轮未修改 duplicate 模块、放宽 timeout / budget、重试完整 Gate 或实施修复；隔离通过不覆盖失败现场。
继续调查需另取得授权，针对同一测试的外部进程生命周期、五秒边界与后续 runner 状态取得可比证据；
在此之前不把资源竞争、Bun 缺陷或产品回归写成已证根因。

## 随附资源

- [all 中 duplicate 行为 lane 的原始失败 transcript](./_resources/261024-record-delivery-duplicate-lane-timeout/duplicate-lane-process.txt)
