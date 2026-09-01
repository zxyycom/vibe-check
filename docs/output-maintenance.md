# 机器输出实现与材料维护

本文面向修改 machine publisher、progress renderer 或随包 machine materials 的仓库维护者。Package consumer 的唯一
machine contract 是[机器输出契约](output.md)；本页只拥有实现归属、publication workflow 与 repository validation，
不随 package 发布。

## Check facts 到 machine files 的投影

`src/check-settlement/**` 先验证并冻结 `{ checks, records }`。`src/machine-output/v4/**` 将 trusted Check-facts snapshot 与
已验证 invocation metadata 组成 trusted input，再创建 v4 projection、序列化 two-file candidate，并在 canonical paths
变更前完整验证 candidate。Projection 不重算 Check status，不解释 Check-local data，也不从 Record 猜测 owner、count、
ID、presentation 或 aggregate。

Validators 检查 schema identity、canonical JSON、Check order、`{ checkId, id }` composite uniqueness/order、Record
ownership 和 complete Record-set fingerprint。Check rows 按 `checkId` 排序；Record rows 按 `{ checkId, id }` 结构 pair
排序，不得把 pair 拼接成 delimiter string。Fingerprint 输入是完整 row array 的 UTF-8 recursive lexical canonical text，
不是 NDJSON bytes。

Machine candidate validation 是 producing-path safety check，不是 public reader API。Check-facts canonicalization 与 output
candidate validation 是两个边界；独立 docs validator 才从 raw checked-in artifact bytes 验收 package materials，且不
import Product validator 作为 acceptance authority。

## 发布生命周期实现

Candidate stages 依次是 validate publication model、serialize machine candidates、validate complete machine set；均在
canonical path 变更前完成。Artifact stages 先清理 stale owned temps，再写齐同目录 temps；全部 candidate writes 成功后
才依次以单文件 rename 替换 `run.json` 与 `records.ndjson`，并宣布 trusted paths。legacy-named 和其它调用方文件不属于 runtime publisher 的删除范围。

Candidate write 或首次 rename 的 handled failure 保留 prior canonical set。一次 replacement 已成功后的 handled failure
清理可能混合的 canonical files 与 owned temps，并返回 typed publication failure；legacy-named 和其它调用方文件
不在 cleanup scope，pre-work configuration failure 不进行 output I/O。两个 independent paths 不形成 OS-level atomic
snapshot，完整集合 fingerprint 与 handled-failure cleanup 承接 fail-closed 边界。

## 进度呈现实现

Product progress 从 producing Run 的 lifecycle facts 呈现 status、duration、受控 reason code 和受管 messages，不从
machine artifacts 恢复状态。每个 visible settled block 先输出 row，再按 preflight console、preflight author、execution
console、terminal author order 输出 message lines；message code 保留在 `RunResult.checkMessages`，不重复到终端。
`attention` 只省略 passed 且无 messages 的 settled row，所有 outcomes
仍计入 canonical ordinal 和最终计数。

普通 TTY 在仍有 Check 运行时每 5 秒重绘 running region，并显示基于共享 monotonic interval 的 elapsed time；首次 running
row 在 heartbeat 前不伪造时长。Plain output 与 `TERM=dumb` 保持 append-only，只在 settled 后输出 row，也不启动
heartbeat timer。Renderer 在 TTY Run 期间独占目标 terminal；resolved-Check execution 在静态 graph 校验后、preflight
task-local Check work 前安装一次 async-context-aware global-console router，在全部 Check 闭合后恢复原 method descriptors。每个 awaited
Check preflight/execution 只建立自己的 capture buffer；context 外调用继续委托 host console。Product 不 patch
`process.stdout` / `process.stderr`；in-process Check 的直接 stream writes 和
child-process 输出必须进入独立 sink，不能依赖当前 target 偶然是 non-TTY 来建立兼容保证。

Captured console 进入 settlement messages，因此显式启用 diagnostic logging 时，同一内容也会写入 `check.finished`
diagnostic details；默认 disabled 不创建该文件。它仍不进入 machine v4，Check author 不得把 secret 当作 console 日志。

Plain/dumb terminal 使用 literal `[info]`、`[warning]`、`[error]`；color-capable TTY 只给 level label 加色。display name、
reason 与 message 都转义 newline、carriage return、tab、terminal controls、ESC、U+2028 和 U+2029；原 message string
保留在 `RunResult.checkMessages`。Writer failure 保持可观察，不吞掉错误或继续后续 write。

## Package 材料的维护与验证

`docs/examples/artifacts/mixed-outcomes/definition.ts` 是唯一随包 machine example 的可执行 Project Definition。
`scripts/docs/machine-artifacts/examples/**` 将当前 source public API 作为内存 module 提供给其 package-root import，通过
完整 public `run` 在隔离的有效 project manifest 上执行一个 `jsonValidation` 与递归自定义 workflow。Definition 的
preflight、dependency、typed readback、messages 和 Records 都经过普通 Product path；生成器只替换固定 invocation metadata，
再写出同目录的 `run.json` 与 `records.ndjson`。Definition 保持为人工维护的 source；regeneration 只清理 retired example
directories 与当前两份 generated outputs。

`scripts/docs/machine-artifacts/package-materials.ts` 精确登记 output guide、两份 current v4 schemas，以及
`mixed-outcomes` 的 Definition 和 two-file output，并按原始 bytes 读取。

`scripts/validation/documentation/machine-artifacts/**` 使用 checked-in schemas 从 raw bytes 独立验证 framing、canonical JSON、
field schema、ordering、ownership 和 fingerprint，再检查 schema/example generation drift。`src/machine-output/v4/**` tests
另行确认 runtime schema source、projection 和 serializer；两条验证路径不把对方的 validator 当作 acceptance authority。

Candidate fingerprint、staging allowlist、packed tar audit、installation audit 与 ancestry-external docs acceptance 都使用同一
closed material registry；installed consumer typecheck 直接包含随包 Definition，documentation acceptance 还把它交给
candidate `run`，核对 package-provided/custom outcomes、三条 RunResult messages、两条 Records 和已配置的 machine
publication。该 registry 的随包范围止于 current guide、schemas 与 example；historical schemas、repository tooling、
generators 和 validators 保留为仓库维护材料。
