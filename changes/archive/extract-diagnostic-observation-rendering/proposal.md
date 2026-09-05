# Proposal

本 Plan 将诊断 observation 的安全人读呈现从 channel router/writer lifecycle 中分离，以消除一个超出 file code-lines 上限的 quality Record；这是一项内部职责迁移，不改变 Product 行为或既有诊断日志字节。

## Why

`src/project-run/diagnostic-logging/logger.ts` 同时拥有 invocation correlation、channel route/writer lifecycle，以及 observation 的 header、facts、escaping 和物理行 continuation 渲染。后者是独立的输出表达职责，造成该文件的 `code-lines` 为 406，超过 300 的当前 file metric 上限。

## Outcome

`logger.ts` 只保留 channel router 和 writer lifecycle；同 owner 的 `observation-rendering.ts` 负责把已经分配 correlation 的 observation 格式化为既有日志文本。定向 quality 结果不再报告 `src/project-run/diagnostic-logging/logger.ts` 的 `code-lines` finding，且不新增 quality finding。

## Scope

### Intended Change

- 将 observation header、escaped tags/event、descriptor-safe detail facts、tag-redundancy omission、120-character inline value 和 200-character physical-line continuation 渲染逐字迁移到 `src/project-run/diagnostic-logging/observation-rendering.ts` 的 `renderDiagnosticObservation`。
- `logger.ts` 保留 direct logger 的 local sequence、router 在每次 open-channel `observe` 前分配一次 invocation-global sequence、shared frozen correlation/safe clock、channel failure isolation，以及 core → learnedAdmission → scheduler 的 idempotent close ordering；它在原 write 前把同一 `{ elapsedMs, invocationId, observation, sequence }` 交给 renderer，并继续 byte append renderer 的返回值。
- 保持所有既有日志字节、event 顺序、Run outcome 与 output failure containment；不改动 invocation/completion、scheduler/admission、detail safety algorithm 或 public contract。

### Resulting Impacts

- 需要用现有 logger formatting/lifecycle tests 证明已覆盖输入上的输出表达和 lifecycle 仍保持可观察行为；测试正文、Case、public API 和 output schema 均不因纯 relocation 而变更。
- “日志字节不变”的证据由局部 source diff 中旧 `renderObservation` 的删除与新 renderer 中相同算法/常量的迁移、以及现有格式化断言共同组成；这不是针对所有可能 JavaScript 输入的形式化或穷举字节比较。未覆盖输入的边界在 Design 的验证边界中明示。
- 需要以定向 file-metrics quality execution 复核 quality Record 从 37 降至 36，且没有新增 finding。

## Success Criteria

- `logger.ts` 不再承担 observation/fact/continuation 格式化，并低于 300 `code-lines` 上限。
- 对现有 formatter tests 覆盖的 header、控制字符、`[]`、backslash、surrogate boundary、line/inline/detail limits 和最终换行，写入日志的字节序列保持既有预期；sequence、correlation、failure isolation、close ordering 与 Run outcome 不变。
- 局部 diff 显示 formatter 的算法和常量仅迁移：logger 在原 write 点调用 renderer 并 append 返回 buffer；没有 formatter 行为改写或 producer/lifecycle 变更。
- logger tests、Test Evidence closure、产品 type/lint/format 和定向 quality verification 通过；不运行 default/full Gate，因其会执行不在本 Change 验收范围内的全仓库 aggregate。

## Affected Owners

- `docs/api-mechanics.md#outputs-与-runresult-边界`：诊断 channel、correlation、human format 与 close 边界。
- `docs/architecture.md#output-and-downstream-boundary`：diagnostic-logging 内 explicit owner channel/router 职责。
- `docs/coding-style.md`：模块职责拆分与实现质量。
- `src/project-run/diagnostic-logging/logger.ts` 与其共置 logger tests：内部 lifecycle 与 formatting 证据。
