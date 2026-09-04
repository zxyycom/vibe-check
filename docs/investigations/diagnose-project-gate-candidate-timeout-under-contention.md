---
title: "Project Gate candidate lifecycle 竞争超时与假失败诊断"
formedAt: "2026-09-04T02:09:52+00:00"
question: "为什么同一 full Project Gate workload 的 package candidate lifecycle 会在 13.9–22.5 秒间波动并曾触发 20 秒 case timeout；当前证据支持优先优化什么？"
tags:
  - "package-candidate"
  - "performance"
  - "project-gate"
  - "test-reliability"
relations: []
---

## 形成时背景

2026-09-04 在干净工作树运行正式根入口
`bun run verify:vibe-check-workspace:full`。运行环境为 Linux x64、Bun 1.3.14；容器
`cpu.max` 为 `400000 100000`，`nproc` 返回 4，Gate Definition 的 root
`maxParallel` 为 3。本轮复用了已安装 candidate，37 个 Check 全部通过；shell wall time 为
28.073 秒，Gate 的 elapsed-to-initial-result 为 27,803.5 ms，其中 candidate preparation
184.9 ms、adapter/setup 362.9 ms、Product Run 27,255.8 ms。

本轮性能 observer 因当前 declarative fingerprint
`9b870f1fe9db40472204330759c08c0815e5e410e025013b213e4327743df19a` 与 checked-in baseline
的 `4a76afb8bedd38e01c3c4c5f9ddb716d49e3d0a5d4cb425059168cc8c9079141` 不同，只报告
`no matching baseline`，没有形成可比较的 advisory 结果。

检查同一天相同 fingerprint、相同 full profile 的近期运行时，发现一次 Gate 失败并非产品或
package 断言失败，而是 `builds, installs, and reuses a physical candidate` 在 20,948.19 ms
触发其 20,000 ms test timeout。该次 suite 仍在 24.34 秒结束，其他 6 个 case 通过。此类由合法
工作在资源竞争下越过 case watchdog 导致的假失败会使 Project Gate 不能形成可信验收结论，因而按项目
规则作为严重 Bug 沉淀本报告。本轮未获授权修改实现，报告只保存调查与后续建议。

## 调查目的

本轮回答三个问题：

1. 当前 full Gate 的实际关键路径在哪里，scheduler 本身是否是主要耗时来源；
2. candidate lifecycle 的 20 秒失败是可复现的行为失败，还是并发资源竞争下的 timeout 假失败；
3. 在不削弱 package、artifact 与 external-consumer assurance 的前提下，下一轮应先取得和验证哪些优化。

本轮不修改 timeout、调度配置、mutex、测试分组、candidate 实现或 checked-in 性能 baseline，也不声称
一次 isolated 测量能够预测修改后的 full Gate 收益。

## 调查范围与依据

### 当前成功 full 运行

- 命令：`bun run verify:vibe-check-workspace:full`。
- Gate 日志目录：
  `.log/project-gate/2026-09-04T02-04-49.411Z-554387-f002325d-861f-42b2-b18c-70dccb88f84c/`。
- 37/37 Check 通过；shell 计时为 wall 28.073 秒、user 65.708 秒、sys 20.206 秒。
- `tests-package-candidate` 从 scheduler span 约 0.042 秒运行至 21.459 秒，Check duration
  21,416.793 ms。
- 受同一 `project-gate-package-lifecycle` mutex 约束的
  `prepared-external-package-consumer` 随后运行 832.2 ms；三个依赖它的 consumer Check 才同时开始，
  runtime、documentation、types 分别耗时约 1.0、3.6、4.7 秒，types 在 span 27.017 秒最后结束。
- scheduler summary 报告 span 26,997.444 ms、max running 3、task-slot 74,877.659 ms、
  root/effective slot utilization 0.924503、completion tail 4,723.271 ms。scheduler control path 为
  18.095 ms，decision observation 为 101.243 ms。
- 同轮其他长 Check 包括 Product function-metrics tests 8.9 秒、validation tooling tests 5.1 秒、
  Markdown link validation 4.9 秒和 function metrics 3.8 秒；它们大部分与 candidate lifecycle 并行。

### 同一 workload 的近期证据

仅纳入 initial result passed、candidate reused、profile full、fingerprint 为上述 `9b870f…` 的四次运行：

| Gate invocation 时间 | elapsed-to-initial-result | candidate lifecycle |
| --- | ---: | ---: |
| 2026-09-04T01:46:13Z | 24,537.8 ms | 13.9 s |
| 2026-09-04T01:49:33Z | 30,609.8 ms | 22.5 s |
| 2026-09-04T01:51:43Z | 28,472.4 ms | 16.3 s |
| 2026-09-04T02:04:49Z | 27,803.5 ms | 21.4 s |

四个 passed 样本不足以建立项目约定的五样本 baseline；它们只证明当前 full 路径和 candidate lane 都有
显著波动，不能单独给出 p90 或优化预算。

### 已确认的 timeout 假失败

- 失败日志目录：
  `.log/project-gate/2026-09-04T01-43-22.785Z-524876-0befd0da-ffa0-4f72-9a8f-5ce952e4ac1e/`。
- `tests-package-candidate` process 正常启动、未触发外层 30 秒 process timeout，但 Bun test 返回 1。
- 唯一失败为 `builds, installs, and reuses a physical candidate [20948.19ms]`，诊断明确指出该 case
  超过 20,000 ms；其余 6 个 case 通过，suite 在 24.34 秒结束。
- `scripts/package/candidate/candidate.test.ts` 同时在 describe 和主要 physical candidate case 上声明
  20,000 ms timeout；`scripts/project/gate/definition.ts` 对整个 lane 声明 30,000 ms timeout。
- 相同源码随后多次通过，当前 full 也通过，因此本轮没有证据表明 package behavior 本身失效。

### isolated lifecycle 测量

在当前 full 完成后，用新临时 fixture 单独运行
`bun test scripts/package/candidate/candidate.test.ts --reporter=junit`：

- suite wall 9.694 秒、user 12.894 秒、sys 4.317 秒；
- `builds, installs, and reuses a physical candidate` 为 7,341.60 ms，占 describe 9.299 秒的约 79%；
- installed documentation drift 的额外安装为 647.11 ms；缺依赖后的 fresh-process reinstall 为
  1,100.95 ms；其他 case 合计远小于 0.3 秒。

isolated 结果证明主要时间集中在 cold build/install/reuse case，也证明该 case 在没有 full Gate 同时运行的
其他重任务时可远低于 20 秒。它不能单独证明 13.9–22.5 秒全部由 scheduler 或 CPU 竞争造成；OS cache、
其他主机负载和 child process 内部并行仍是未隔离变量。整轮 full 的 user+sys CPU time 约为 wall time 的
3.06 倍，而 isolated lifecycle 约为 1.78 倍，结合 root `maxParallel=3`，支持“外层一个 Task 不等于一个
CPU slot、多个 Bun/tsgo workload 会竞争资源”的解释，但尚未形成因果闭合。

### 代码与契约边界

- Gate 已用 learned-critical-path admission，并保存五个历史 duration sample；本轮最先准入的就是
  candidate lifecycle、Product function-metrics tests 与 prepared candidate。因此单纯改静态顺序不是
  主要机会。
- candidate lifecycle test 使用独立临时 build/state/consumer 根；external-consumer provider 使用另一
  invocation-local 临时根并只读已准备 artifact。不过当前脚本文档明确要求会改变 package lifecycle 的 Check
  共用 lifecycle mutex，不能仅凭路径表面独立就删除 mutex。
- external consumer 的 types、documentation、runtime acceptance 已在共享一次 isolated install 后并行执行，
  没有观察到三次重复安装。
- performance observer 按当前稳定规则不得解析 diagnostic scheduler log；如果 Gate 需要直接呈现 critical
  tail，应从 Product 的正式 Run result/measurement boundary 提供结构化事实，而不是增加 log scraping。

## 调查结果与边界

### 已确认事实

1. 当前 full Gate 的主要优化对象不是 scheduler 控制代码：约 27 秒 span 中 control path 仅 18.095 ms，
   当前算法也把历史预测最慢的 candidate lane 立即启动。
2. 当前关键链是 candidate lifecycle、受 lifecycle mutex 延后的 external-consumer preparation，以及三个
   consumer acceptance 中最慢的 types acceptance。本次 completion tail 为 4.723 秒。
3. candidate lifecycle 的主要 isolated 成本位于 cold physical candidate case，而不是其余轻量断言。
4. 20 秒 case timeout 已在正式 full Gate 中产生过假失败；它与外层 30 秒 lane timeout 形成两层不同 watchdog，
   并把资源竞争抖动误判成 package correctness failure。
5. checked-in performance baseline 已因 declarative fingerprint 漂移而不匹配；当前 observer 不能告警真实回归，
   也不能证明本轮比 2026-09-02 baseline 更慢或更快。

### 推断

1. candidate cold build/install 同时使用多个 CPU，外层 scheduler 把每个 Check 等价计为一个 slot；candidate、
   function-metrics tests 与 validation tests 同时运行时的资源竞争很可能是 candidate duration 膨胀和 timeout
   抖动的重要来源。该解释得到 isolated/full CPU 与 wall 差异支持，但尚需受控调度矩阵验证。
2. 仅删除 lifecycle mutex 最多只能回收当前约 6.115 秒未使用 slot-time，对三 slot 的理论 wall 上界约为
   2.04 秒；实际收益还会被任务竞争抵消。它不是无需验证的 5 秒收益。
3. 直接把 `maxParallel` 从 3 提升到宿主配额 4 有较高的过度订阅风险，因为一个 candidate Task 已可使用超过
   一个 CPU；当前证据不支持把提高并发度作为首个修改。

### 建议的后续顺序

1. **先修验收可信度。** 将 correctness test 的 timeout 与 performance budget 分离：case/lane timeout 只作为
   有充分余量的 hang watchdog，性能退化由 advisory baseline 或 benchmark 判断。修改时需同时审阅 20 秒 case
   和 30 秒 lane 两层边界，并用资源受限 full Gate 证明不再出现假失败；只放大其中一层不是完整修复。
2. **给 cold candidate case 增加 phase evidence，再动实现。** 至少分别测量 fingerprint/documentation、tsgo
   emit、staging audit、pack+packed audit、first install+dependency probes、reuse inspection 与 forced reinstall。
   当前 7.34 秒 case 粒度不足以判断应优化 build、audit 还是 Bun install。
3. **做资源感知的调度实验，不要先永久改 `maxParallel`。** 在相同 candidate、fingerprint、runtime 和 warm/cold
   条件下，交错比较 root parallel 2/3/4，以及 candidate 与另一个重 lane 是否并发；每种至少收集足够样本并
   同时比较 wall、candidate duration、task-slot utilization 和 timeout 率。若“candidate 活跃时降低有效并发”
   能减少总 task time，再决定用 scope、mutex 或更一般的 task resource cost 表达。
4. **单独验证 lifecycle mutex。** 先证明 candidate fixture 与 external consumer 在文件目标、Bun install cache、
   清理和取消路径上可安全并发，再做同 workload benchmark。即使可解除，本轮数据给出的 wall 改善上限有限，
   不能以速度为由牺牲 lifecycle 隔离。
5. **关键路径下降后再优化 consumers。** types acceptance 本轮 4.7 秒，documentation 3.6 秒；它们已经并行，
   应先 profile 各自内部 compiler/docs build，并保留独立证明价值，而不是机械合并 Check。
6. **最后建立新的可比较 baseline。** 在最终 Definition fingerprint 稳定后，按当前项目方法收集五次交错、顺序
   full/required standard invocation，更新 raw samples、median、p90 与 threshold。还应让 baseline fingerprint
   漂移成为明确的维护提示，否则 observer 会长期退化为 `no matching baseline`。
7. **改善诊断可见性时走正式数据边界。** 可以让 Run result 或 measurement API 暴露结构化 critical-tail
   contributor，再由 Gate 输出；不要解析 1.6 MB diagnostic log，也不要把最慢单 Check 误当成关键路径。

### 未采用与未知

- 不建议本轮直接删减 package candidate、artifact 或 external-consumer Check；它们证明的 lifecycle、artifact、
  types、documentation 与 runtime 边界不同，尚无证据表明存在可删除的重复 assurance。
- 不建议以关闭 diagnostic logging 优化本轮；scheduler control/observation 成本相对总时间很小，且日志是当前
  定位假失败与关键链的必要证据。
- 未 profile candidate case 内部各 phase，未运行 parallel 2/3/4 对照，未在其他 OS、CPU 配额、冷 package
  cache 或 CI 环境复现。因此本报告的调度与收益建议只适用于当前 Linux x64、Bun 1.3.14、4 CPU quota 的本机
  workload；Definition、candidate 实现、Bun 版本或资源配额变化后需重新调查。
