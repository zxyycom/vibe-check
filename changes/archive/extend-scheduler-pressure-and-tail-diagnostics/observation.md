# Acceptance Observation

本文件记录 `extend-scheduler-pressure-and-tail-diagnostics` 在 2026-09-02 的本机验收观察。它只保存本 Change 的证据与有限解释，不把单次运行升级为 benchmark、性能收益或 capacity 因果结论。

## Candidate identity

- Git branch: `codex/require-passed-dependencies-and-observe-outcomes`
- Git `HEAD`: `4c459052b31d4587c38733c0367235d7bc10a678`
- Gate candidate 来自以上 `HEAD` 之上的未提交工作树；验收闭合时 index 无 staged changes，工作树包含本 Change 的 Scheduler/Invocation、测试、稳定文档、Decision 演进与 Change artifacts 改动。因此 `HEAD` 只是基线，不是可单独复现该 candidate 的提交身份。
- required 与 full summary 的 exact declarative fingerprint 均为 `c5b8e9aa4e68d3323db57c923b911767909724fa6fe01c0c236d0e93e644cdf3`。这只证明 canonical declarative Definition identity 相同；仍不覆盖实际 execution selection、terminal outcomes、`RunControls`、代码或 candidate bytes、工具/runtime/host，以及 custom callback 的 identity/source/closure。

## Gate outcomes

| Profile | Invocation | Terminal outcome | Raw diagnostic log |
| --- | --- | --- | --- |
| required | `invocation/v1:841a0c3f-f911-4270-8a6b-794b18e08e8e` | aggregate `passed`; 30 passed, 3 not-applicable, 3 unavailable, 0 failed | `.log/project-gate/2026-09-02T00-31-06.581Z-1968407-cd725f69-7ec1-4d1d-aef8-f12c99faf839/run-20260902T003106.688Z-841a0c3f-f911-4270-8a6b-794b18e08e8e.log` |
| full | `invocation/v1:8b215b7a-9f87-4ae1-afe8-d871a110871d` | aggregate `passed`; 36 passed, 0 not-applicable, 0 unavailable, 0 failed | `.log/project-gate/2026-09-02T00-31-24.552Z-1972609-5507d12d-760b-473e-bdfa-a0c4d06f40de/run-20260902T003124.647Z-8b215b7a-9f87-4ae1-afe8-d871a110871d.log` |

## Added summary facts

| Field | required | full |
| --- | ---: | ---: |
| `admissionViablePendingTaskMs` | 110721.425 | 241528.685 |
| `mutexBlockedTaskMs` | 4408.959 | 5655.967 |
| `capacityBlockedTaskMs` | 102938.426 | 234459.032 |
| `admissiblePendingTaskMs` | 3374.040 | 1413.687 |
| `peakAdmissionViablePendingTaskCount` | 31 | 31 |
| `peakMutexBlockedTaskCount` | 2 | 2 |
| `peakCapacityBlockedTaskCount` | 28 | 28 |
| `peakAdmissiblePendingTaskCount` | 31 | 31 |
| `discrete.completionTailActiveTaskCount` | 3 | 3 |

按日志三位小数投影，required 的 queue task·ms 分量精确闭合；full 的分量和与 total 相差 `0.001 ms`，属于各字段独立显示舍入。按 total 计算的观察占比为：

- required: mutex `3.982%`、capacity `92.971%`、admissible `3.047%`；
- full: mutex `2.342%`、capacity `97.073%`、admissible `0.585%`。

这些比例描述 admission-viable pending Task 的 sampled task·ms 组成，不是 wall time、CPU utilization 或 policy reason。它们显示这两次运行的 queue pressure 主要处于 canonical capacity hard guard；`capacity-blocked` 不区分 root、当前 active scope 与 prospective tightening scope，因此这些数值不能单独证明提高 `maxParallel` 会改善总耗时或安全性。

## Top admission-delay breakdown

required:

| Task | Delay ms | Mutex ms | Capacity ms | Admissible ms |
| --- | ---: | ---: | ---: | ---: |
| `git-diff-whitespace` | 7432.452 | 0 | 7264.442 | 168.010 |
| `test-evidence-rule-tests` | 7411.631 | 0 | 7244.983 | 166.648 |
| `test-evidence` | 6681.849 | 0 | 6516.346 | 165.503 |

full:

| Task | Delay ms | Mutex ms | Capacity ms | Admissible ms |
| --- | ---: | ---: | ---: | ---: |
| `git-diff-whitespace` | 13049.947 | 0 | 12975.117 | 74.830 |
| `test-evidence-rule-tests` | 13029.559 | 0 | 12955.876 | 73.683 |
| `test-evidence` | 12575.421 | 0 | 12504.021 | 71.400 |

每一行在日志显示精度内满足 `mutexBlockedMs + capacityBlockedMs + admissiblePendingMs = admissionDelayMs`。Top-three 只说明这些实际 admitted Tasks 在 admission 前经历的三类互斥分类区间，不说明 Scheduler 或 custom policy 的选择原因。

## Completion-tail contributors

| Profile | Tail active count | Contributors by descending settlement delta |
| --- | ---: | --- |
| required | 3 | `markdown-link-validation` 1422.647 ms; `test-evidence` 410.264 ms; `git-diff-whitespace` 27.927 ms |
| full | 3 | `markdown-link-validation` 1400.540 ms; `test-evidence` 628.516 ms; `git-diff-whitespace` 33.214 ms |

两次运行的完整 tail active count 都等于有界列表长度，因此本次没有 contributor 截断。contributors 是最后一次 admission boundary 的逻辑 post-state active snapshot 成员及其 settlement delta；它们不是 dependency critical path、CPU bottleneck 或单项因果归属。

## Acceptance boundary

- Deterministic Scheduler/Invocation tests覆盖 projection 互斥与闭合、post-mutation boundary、prospective scope capacity、custom wait、delay 求和、tail membership/bound/order、fingerprint exact handoff、zero-span/unavailable、disabled diagnostics、cancellation、policy-fault drain 与 writer containment。
- Test Evidence Case/Proves、稳定 architecture/API/testing owners 已同步；独立 correctness review 无阻断问题，AI-ready 文档审阅与以 `docs/coding-style.md` 为权威的代码优化已完成。
- required/full Gate 都通过，并在同一条 human-only `scheduler.summary` 中直接观察到全部新增字段。没有新增 public/machine/progress/schema/parser/version/OS telemetry，也没有自动调整 capacity 或 priority。
- 本 Change 增加的是诊断分辨率，不是已证明的性能优化；这些运行没有建立跨样本 benchmark budget，也不能据此声称吞吐或耗时改善。
