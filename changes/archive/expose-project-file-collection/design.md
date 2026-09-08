# Design

本 Plan 以一个经过 public validation 的单 selection façade 复用现有 project-file collector，同时保持 Check-owned policy 与 private enumeration optimization 的边界。

## Context

**已确认事实与约束**

- 真实 consumer 是自定义 Check 与普通项目脚本；其共同结果是从 caller 显式指定的 project root 按一份 Product file selection 收集 paths，而不是复用某个 Check 的领域模型。
- `src/package-checks/project-files/collection.ts` 的 trusted `collectProjectFiles(rootDir, selection)` 与 private `collectProjectFileSets(rootDir, selections)` 已由 package Checks 使用。后者按 source 共用候选枚举，是内部批处理优化；它的命名 key、`Map` 和多 selection 行为没有当前 public consumer。
- `ProjectFileSelection` 是完整的 `source`/`include`/`exclude` selection；`ProjectFileSelectionOptions` 是 owning Check 结合自己的 defaults 时使用的 authoring partial shape。public collector 不能替 custom/ordinary consumer 猜测某个 Check 的默认值。
- 当前 collection 对两个 source 都产生 project-root-relative slash paths，并 stable sort/dedupe；filesystem 与 Git source 失败停止并报错，不 fallback 或伪装空集。成功的空集合合法。
- 第一版必须同步、只处理一份 selection，且不支持中途取消。它不公开 `codeAreas`、content read、cache、watcher、batch 或 source candidate collection。

`docs/development/project-files.md` 拥有 collection 与 exact-input 稳定事实；`src/index.ts` 是唯一 public entry，documentation tooling 拥有 public guide/example projection 与 package material mechanical validation。

## Goals / Non-Goals

**Goals**

- 提供一个只有显式 root 与一份完整 selection 的 public operation，供 custom Check 和普通脚本直接消费 Product 选择机制。
- 在 public boundary 对 unknown/hostile options 完成 closed-record、root 与 full selection validation；内部 collector 只收到可信完整值。
- 以 detached frozen snapshot 返回 stable relative slash paths，清楚区分合法空结果、authoring/input error 与 selected-source collection failure。
- 保持现有 filesystem/git-worktree enumerator、glob grammar、source-specific semantics与 package Check exact-input owner，避免重新实现枚举。

**Non-Goals**

- 不把 `ProjectFileSelectionOptions` 的省略字段解释为 Product-wide defaults；调用方明确选择完整 `ProjectFileSelection`，可组合已公开的 `defaultProjectFileSelection`。
- 不公开或承诺 `collectProjectFileSets`、`ReadonlyMap`、selection names、source candidates、遍历剪枝、cache、watcher、content read、`codeAreas`、Check eligibility 或 scanner exact-input handoff。
- 不改变 package-provided Check defaults、同步模型、Git/filesystem source meaning、`.gitignore` 规则，或为同步函数加入 `AbortSignal`/取消语义。

## Decisions

### Intended Change

新增一个由 package root re-export 的 documented public façade，命名为 `collectProjectFiles`，采用单个具名 options 参数：

```ts
collectProjectFiles({ projectRoot, selection }): readonly string[]
```

其中 `projectRoot` 为显式非空、无 U+0000 的 string root；relative text 相对当前 current working directory、absolute text 直接使用，implementation 在 boundary `resolve(...)` 为 absolute root，绝不在调用方遗漏 root 时隐式使用 current working directory。`selection` 必须为完整的 `ProjectFileSelection` shape：exactly `source`、`include` 与 `exclude`；source 是 supported closed value，两个数组只含 string。public typing 提供该 shape，但 runtime 仍以 `unknown` 校验 caller/JS/unsafe input，拒绝 extra keys、缺失字段、array/non-record options、非法 root 和 hostile nested values。

façade 在 `src/package-checks/project-files/**` 归属中解析及 snapshot public input，再调用原有 trusted single-selection collector；不 export 或放宽内部函数。它 clone/freeze returned array，以避免给 public caller mutable snapshot。普通 invalid invocation 以带 action 的 `TypeError` 同步抛出；filesystem traversal 与 selected Git source 不可用保留为同步 collection error，包含 source/root failure context且绝不变为 `[]` 或切换来源。`[]` 只表示成功、没有匹配 path。返回 path 永远相对指定 root、slash-normalized、stable text-sort且去重。

### Resulting Impacts

- 新 public operation 与其 options type 必须在 `src/index.ts`、public API inventory、type acceptance 和 public-root Chinese JSDoc/inventory evidence 中闭合；禁止意外 export private batch/helper symbols。
- project-files tests 必须直接证明 public boundary 的 options/root validation、frozen detached snapshot、stable selection result、valid empty result和 source failure distinction；已有 internal collection tests继续拥有 candidate/source mechanics。
- `docs/development/project-files.md` 必须记录 public operation 与 Check-owned policy/private capability 的边界；README 链接一个 package-published public guide。guide 的 executable example 从 `docs/examples/package-api/` 受管投影，并证明 custom Check/ordinary-script consumer 按完整 selection 调用，不读取 content。
- `docs/testing/cases/scan-scope.md` 与 test evidence 必须按新增/变更 test entity 的真实 owner/proof更新；installation consumer acceptance 需证明 package root import、type surface 与 runtime normal/failure behavior。

## Risks / Trade-offs

公开 operation 会锁定 root resolution、full selection grammar、synchronous throwing、path snapshot order/immutability和 filesystem/git behavior；因此第一版以完整 selection 而非 partial Check options 防止未声明 defaults 进入 API。封装而非直接 export 增加很小的 validation layer，但保留 typed-trust internal boundary和未来 private batch optimization。同步 collection无法在工作中观察取消；伪装 `AbortSignal` 会承诺无法可靠提供的行为。文件系统在收集后发生改变仍可能令随后 consumer read 失败；collector 只承诺调用时的 path snapshot，不承诺 contents/readability/transactionality。

验证过程与最终完整 Gate 证据统一见 [Tasks](tasks.md)。局部验证不替代安装包消费者的类型、运行时和文档验收。

## Open Questions

无。主代理已确认 `collectProjectFiles({ projectRoot, selection })`、完整 `ProjectFileSelection`、relative/absolute root 后 `resolve(...)`、同步 `TypeError` invalid input 与 `Error` source/I/O failure。方向由 active、已对齐的 [provide-synchronous-single-selection-file-collection](../../../docs/decisions/provide-synchronous-single-selection-file-collection.md) 承接；它与已对齐的 [select-check-files-from-explicit-sources](../../../docs/decisions/select-check-files-from-explicit-sources.md) 并列，因为独立工具不改变 Check-owned selection contract。完整本地 Gate 与非实施审查证据见 tasks；Decision alignment 已经复核。

## Implementation Observations

public façade、package root/inventory/installed-consumer evidence、package guide/example 与 scan-scope Case 均已完成。它复用 trusted collector，未改变 source candidates 或 Check-owned policy。实施时旧 installed candidate 曾导致 Gate controls 类型暂时不匹配；重新构建 exact candidate 后已通过完整 Gate，任务 2.2 已完成。最终验证与审查记录见 [Tasks](tasks.md)，不再保留待主代理执行的状态。
