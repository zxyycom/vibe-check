---
title: "审计 Project Gate candidate lifecycle 的重复物理工作与进程开销"
formedAt: "2026-09-04T02:45:40+00:00"
question: "为何 full Project Gate 的 tests-package-candidate 反复超过 5 秒，以及在保持 root maxParallel=3、20 秒 case/30 秒 lane 硬门禁不变时，怎样以可验证的架构变更使该 Check 稳定低于 5 秒？"
tags:
  - "package-candidate"
  - "performance"
  - "process-overhead"
  - "project-gate"
relations:
  - type: "复查"
    target: "correct-project-gate-candidate-timeout-interpretation.md"
---

## 形成时背景

2026-09-04，用户明确拒绝仅把 candidate Check 的局部 `maxParallel` 调为 2 的微调，要求调查 full Project Gate 中 `tests-package-candidate` 的真实进程与重复工作根因，并要求同类大 Check 都应审计。当前约束是 root `maxParallel=3` 不变；candidate 的 20 秒 case 和 30 秒 lane 都是必须保留的阻断性性能门禁，不能以提高 timeout、重试或降级 advisory 消除越界。

本轮复查直接前序报告对“应先优化真实 candidate work、而非放宽 timeout 或改变 root 并发”的修正，并将范围收窄到 `scripts/package/candidate/**`、`scripts/package/artifact/**`、Gate 对它们的 typed input，以及其测试 owner。开始时工作树已有其他线程新建但未索引的调查报告和索引改动；本报告不修改它们，也不运行 full Gate。

## 调查目的

本轮回答：

1. `tests-package-candidate` 的 wall time 实际花在何种物理 build/install/resolve 工作及多少个 child process；
2. 这些工作与 Gate 在 Product Run 前准备 exact candidate、artifact acceptance 和 external-consumer acceptance 的关系，哪些是同一事实的重复证明；
3. 为什么 candidate-local cap 不是足够方案；
4. 怎样同时保留 exact artifact、private installation、dependency containment、reinstall/reuse 与 consumer assurance，令 `tests-package-candidate` 的正常 Gate 路径稳定低于 5 秒。

本轮不实施脚本、测试、Decision、Case 或 Gate Definition 改动；临时计时 instrumentation 在测量后已还原。

## 调查范围与依据

### 源码与 Gate 图

检查了当前 `scripts/package/candidate/prepare.ts`、`install.ts`、`receipt.ts`、`candidate.test.ts`、`artifact/` build/audit/input，以及 `scripts/project/gate/run.ts`、`definition.ts`、test-entry adapter、external-consumer provider/material。

实际 full Gate 的相关图如下（`→` 是进程或 data dependency，方括号是独立 Bun process）：

```text
Gate root Bun
  ├─ preparePackageCandidate()（Product Run 前、一次 exact candidate）
  │    ├─ rebuild 时 [bun x tsgo …] → staging/audits → [bun pm pack]
  │    └─ install/reinstall 时 [bun install] → [resolve candidate]
  │         → [resolve jscpd] → [jscpd --version] → [resolve ajv]
  └─ Product Run
       ├─ prepared-package-candidate（读取并核对同一 typed fact）
       ├─ tests-package-artifact (dataDependency: prepared candidate)
       │    └─ Gate input 时只读取/audit shared staging+tar；不 direct-build
       ├─ prepared-external-package-consumer (dataDependency: prepared candidate)
       │    └─ [bun install] → [resolve public entry]，一次 installation material
       ├─ consumer types/docs/runtime (dataDependency: external material)
       │    └─ 三者复用该 install，各自只运行其独立 acceptance
       └─ tests-package-candidate（没有 Gate candidate input）
            └─ 自己创建临时 build/state/consumer，重新执行物理 lifecycle
```

上述最后一支不是对 Gate-prepared candidate 的观察：`candidate.test.ts` 的 fixture 固定使用临时根，首次调用 `preparePackageCandidate` 必定 cold rebuild，随后同一 suite 还故意触发 installed-document drift 的直接 `installCandidate`，并删除 `jscpd` 后在 fresh Bun process 中再次 `preparePackageCandidate`。相反，artifact lane 通过 `VIBE_CHECK_CANDIDATE_*` 环境变量取得 shared input；其 direct-build fallback 仅发生在单独直接运行 artifact test 时，不发生在 full Gate。

### 可复现目标级采样

环境为本工作区 Linux x64、Bun 1.3.14、容器 `nproc=4`（host online processor 查询为 6）。没有运行 full Gate。为采集 `scripts/package/pack.ts` 的每一次 `runBun`，临时在其同步 runner 前后写入 phase wall-time marker，执行后恢复原字节并用 `git diff --exit-code -- scripts/package/pack.ts` 确认无残留。

命令与原始结果：

```text
time -p bun test scripts/package/candidate/candidate.test.ts --reporter=dots
7 pass, 0 fail, 28.10s suite wall
real 28.14s; user 15.47s; sys 4.97s

emit readable runtime and declarations                 7,372.120ms
pack candidate                                             124.455ms
first private bun install                               7,783.936ms
first install verification: candidate/jscpd/bin/ajv       249.088ms
reuse verification (candidate/jscpd/bin/ajv)              138.541ms
post-staging-drift inspection probes                      136.992ms
installed-document-drift bun install                    7,764.825ms
visible resolution after missing-dependency setup          35.324ms
```

marker 所在的父测试进程还用 `spawnSync` 启动一次 fresh resolver 和一次 fresh Bun preparation；后者的 stderr 被测试捕获，因此其内部 reinstall + 四个 verification child 未出现在父 marker 输出。按源码路径，candidate suite 至少启动 24 个直接/间接 Bun child：初次 rebuild/install 的 7 个、两轮 reuse/inspection 的 8 个、document-drift install 加 entry resolve 的 2 个、fresh resolver 的 1 个、fresh preparation 父进程的 1 个，以及该 fresh preparation 内 reinstall + 4 probes 的 5 个。这个计数不含 `tsgo`/`bun install` 内部可能派生的工具子进程。

对照直接 artifact test 的同一 instrumentation：

```text
time -p bun test scripts/package/artifact/artifact.test.ts --reporter=dots
5 pass, 0 fail, 11.49s suite wall
real 11.51s; user 15.91s; sys 1.99s
emit readable runtime and declarations                 6,850.371ms
pack candidate                                             200.143ms
```

这是 direct fallback 的成本证明，**不是** full Gate artifact lane 的成本。此前形成时材料记录的无 full 竞争 candidate suite 为 9.694s，主 physical case 7.342s；本轮的 28.10s 不能直接外推为稳定常态，但两轮都证明该 test 的主要路径是物理 lifecycle 而非 assertions，且都高于 5 秒目标。

## 调查结果与边界

### 已确认事实

1. **大头是真实外部工作，不是 scheduler bookkeeping。** 本轮最慢的可见 phase 是 `tsgo` emit 7.372s、两次 `bun install` 各约 7.8s；`pack` 仅 0.124s，单个 resolver/probe 为约 31–78ms。局部并发 cap 只能改变竞争，不能删除这些进程、编译或多次安装。
2. **full Gate 已避免 artifact/consumer 的一部分重复。** artifact acceptance 读取 shared prepared candidate；三个 consumer Check 复用一个 external installation。这些边界不能被误报为“每个 Check 都重新 build/install”。
3. **candidate lifecycle lane 自己重复了一次完整候选生命周期。** Gate root 已先生成/复用 exact candidate，随后该 lane 用无关临时 root 再 cold build、pack、install 和 verify。它还为了失败路径在同一 suite 再做两次 install/reinstall。这是该 lane 超过 5 秒的直接、可消除原因。
4. **一次 install 的验证又碎成多个短进程。** `installCandidate` 为 install 后 entry resolve、jscpd dependency resolve、jscpd `--version`、ajv resolve 各启动一个 Bun；每次 reusable inspection 重复四个 probe。它们在本轮不是主要时间，却是 24+ child 图中的确定性启动开销与 contention 放大器。
5. **20 秒/30 秒门禁仍有独立证明价值。** 它们继续监控真实 cold lifecycle 和 lane 防挂死；本报告不主张放宽、重试或隐藏越界。

### 推断

1. 当前 12–23s、最近约 21s 的 full-Gate lane 观测可由此 lane 的 cold compiler、至少一次 install、额外 failure-path install 与 root 3 槽竞争共同解释；现有样本尚不能把每一毫秒严格归因于 CPU contention。
2. 仅把 lane cap 改为 2 最多重新分配这些重进程与其它 Check 的重叠，不会使该 lane 的固有 physical lifecycle 消失，因而不能作为“稳定 <5s”的主方案。
3. 若 exact candidate 已在 `env:setup` 或本次 Gate root preparation 建好，Gate 内再用隔离 fixture 重建同一 source fingerprint 并不增加独立的发布/consumer assurance；它是在另一个临时路径重复运行同一个 builder/installer 实现。

### 建议：一次真实 lifecycle provider + 轻量 verification consumers

建议建立以下架构，而不是调小并发或删减 assurance：

1. **把唯一真实 candidate lifecycle 设为 Gate root 已有的 exact preparation。** 将其输出从当前 typed identity/fact 扩展为 versioned、只读的 lifecycle evidence：`rebuild|reinstall|reuse` decision、artifact digest、private resolved entry 与按阶段的 monotonic duration。它仍执行 cold build/pack/install 和 fail-closed audit；prepared-candidate Check 验证并发布此 evidence，所有 package acceptance 只能依赖该 exact data。
2. **让 `tests-package-candidate` 改为 prepared-candidate consumer，而非另建 detached lifecycle。** 在 Gate mode 它只验证已发布 artifact/receipt/private install/reuse decision 与 typed evidence 的一致性；不创建临时 build/state/consumer、不再次编译或安装。这样它保留“Gate 选择的确切 candidate 可复核”的证明，目标应是 file/hash/DTO assertions 的亚秒到低秒路径，显著低于 5 秒。
3. **把 forced-reinstall、ancestor fallback、坏 receipt/坏 documentation 的行为测试移到可控的 unit/contract fixture。** 为 candidate preparer/install runner 引入窄的 command-and-filesystem seam；大多数失败路径用小型 fixture 或受控 process result 断言 decision、cleanup、fail-closed 和诊断。保留一个非 Gate、显式 benchmark/integration target 用于周期性真实 cold lifecycle 回归，但不要把三次真实 install 塞入每一次 full Gate lane。该 target 的性能结果仍须与 20 秒门禁同样严肃处理，不得被删除或标成 optional correctness。
4. **合并 install 后的 probe fan-out。** 以一个受控 Bun probe program 输出 closed JSON，一次性完成 package entry、两个 dependency containment/version 与 jscpd engine version 检查；从每次 install 后 4 个 probe child 变为 1 个。保留所有现有判定和失败语义，只减少 process startup。
5. **保留 artifact 与 external-consumer 的现有共享边界。** artifact acceptance 继续读取 shared staging/tar；external provider 继续只安装一次，其三个 consumer Check 继续各自证明 types、docs、runtime。external provider 可同样把 install 后 public-entry resolve 合并到一个 probe，但不能与 private Gate consumer 混用安装根。

此方案的可执行验收顺序：先给 root preparation 记录阶段 evidence；再使 candidate lane 强制要求 Gate typed input 并拒绝 direct fallback；随后用 seam 保持 failure-path contract tests；最后合并 probe。针对每一步，运行该 owner 的最窄 tests 和 direct lifecycle benchmark；最终在 root=3、20s/30s 不变的 repeated full workload 中报告 candidate lane raw samples、median/p90、timeout 次数、Gate candidate-preparation time、total elapsed 和 child count。通过条件不是“总 Gate 隐藏了时间”，而是 `tests-package-candidate <5s`、所有 exact artifact/installation/consumer 证明仍通过，且冷 preparation 未超过既有硬预算。

### 保留与失去的证明

- **保留：** 真实 exact artifact 的 build/pack/audit、private candidate install、entry/dependency containment、artifact and external consumer isolation、types/docs/runtime 的独立 consumer assurance、rebuild/reinstall/reuse 的 fail-closed decision，以及 20 秒/30 秒 gate。
- **停止重复证明：** 每次 full Gate 中 detached test fixture 对同一 source fingerprint 的第二次 compile/pack/install，以及为了行为分支再发生的两次真实 install；这些改由 Gate preparation 一次实际执行和小型 contract fixtures 覆盖。
- **新增风险：** preparation evidence 若不能闭合为 typed、validated Gate data，测试会退化为信任 root side effect；因此必须 version、parse、hash/physical validate 并在 artifact/consumer 依赖前 fail closed。seam 若错误模拟 Bun install，也可能损失真实工具兼容性；所以必须保留单独真实 integration benchmark 和定期冷环境复测。

### 未知与重新调查条件

- 本轮未取得 `tsgo`、`bun install` 的 CPU/thread profile，未证明哪一工具内部并发最适合进一步优化；也未运行 full Gate 或 root=3 的 before/after repeated matrix。
- 当前 sample 受共享宿主负载影响，28.10s 不能作为单一 baseline；报告列出原始命令、环境和每个可见 phase，供后续同条件复测。
- 若将来改变 exact-candidate handoff、Bun version、CPU quota、package dependency graph、20s/30s 预算或要求 direct `bun test` 也必须走 Gate input，应重新调查该图和验收边界。
