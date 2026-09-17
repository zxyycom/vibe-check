# Design

本 Draft 的当前方向是在既有显式项目文件收集机制之上提供双向、无 policy 的成员关系查询：先形成路径与 selection 的事实，再由调用方施加自己的规则。

## Context

- [`docs/guides/collecting-project-files.md`](../../docs/guides/collecting-project-files.md) 拥有公开单份 `collectProjectFiles(...)` 的输入、来源、路径快照和失败语义；[`docs/development/project-files.md`](../../docs/development/project-files.md) 拥有内部收集与 exact-input 机制。
- private `collectProjectFileSets(root, selections)` 已按 source 分组：每种 source 只枚举一次候选，再对每个具名 selection 应用完整的 include/exclude 语义。它不直接构成 package API。
- 当前 `ProjectChanges` 以 `{ path, flags }` 保留一个路径的多重匹配事实；同样，`duplicateDetection`、`fileMetrics` 与 `functionMetrics` 的 `codeAreas` 可以重叠。成员数量必须由消费方解释。
- active Decision [`retain-on-demand-project-file-collection`](../../docs/decisions/retain-on-demand-project-file-collection.md) 保持按需收集，并排除 Definition/Run 级 shared file context、pre-admission barrier 与公共 cache/refresh 契约；它允许因独立共享 path-membership consumer 以新的 Change 评估最小方案。

## Goals / Non-Goals

### Goals

- 让一次显式调用能保留 inventory 中每条 path 与全部实际匹配具名 selection 的关系，包括零和多重命中。
- 同时支持 path → selection IDs 与 selection ID → exact paths 的只读查询，不把两份完整关系数组作为公开 payload。
- 保持当前 source/include/exclude 的实际语义；不同 source 的结果不能被简化为仅按 glob 推断。
- 在同一 source 的 inventory 与 selections 间复用一次候选枚举，且查询阶段不再触发 I/O。

### Non-Goals

- 不新增内置 coverage Check、默认 Gate policy、唯一归属规则、waiver、Record 或 machine-output schema。
- 不改变现有 `codeAreas`、Check-owned selection、exact-input acceptance 或 scanner behavior。
- 不新增 Definition 字段、Run context、dependency provider、跨 Check cache、refresh/generation API、内容读取或原子文件系统快照承诺。

## Decisions

### Intended Change

暂定新增一个 package-root 同步工具（名称待定），输入为 closed、显式的 `{ projectRoot, inventory, selections }`：

| 对象 | 作用 | 不承担的判断 |
| --- | --- | --- |
| `inventory` | 用 filesystem 形成调用方定义的受管 path 全集。 | 哪些路径应被视为覆盖、唯一或失败。 |
| 具名 `selections` | 保留完整 `ProjectFileSelection` 的 source/include/exclude 语义，形成各配置的实际 exact paths。 | 相互独立或互斥。 |
| 查询值 | 将 inventory path 映射到 0..n 个 selection IDs，并反向查询 selection 的 exact paths。 | Check status、Finding、Record 或 Gate 结果。 |

- 工具把 inventory 与所有 selections 一并交给内部批量 collector。相同 source 共用候选枚举；不同 source 独立采集并保留其真实结果，不能用纯 glob 近似替代。
- 查询值不可变、稳定排序，且查询阶段不触发 I/O。它必须区分已知 inventory path 的空命中与未知 path，以及已知 selection 的空 path 集与未知 selection。
- 公共查询契约不暴露内部索引布局。实现可根据基准选择线性、惰性或 eager 的反向查询策略。
- 输入与 acquisition 失败沿用现有收集边界：非法 input 抛 `TypeError`，任一实际 source acquisition 失败抛普通 `Error`，不回退来源或伪造空 membership。查询不读取文件内容，结果只代表收集时的路径成员关系。
- Tool 不把 0、1 或多个匹配映射为 status。Gate、custom Check 或普通脚本在自己的 policy 中消费查询结果，并承担 Finding、Record、terminal outcome 与任何唯一性定义。

### Resulting Impacts

- project-files owner 需要为多 selection public input、inventory 的 filesystem 边界、查询 identity、snapshot/freeze 和失败语义建立实现与测试；已有 `collectProjectFiles(...)` 保持单 selection API 和行为不变。
- package root exports、type declarations、公开 project-files guide、README API index、JSDoc、API examples 与 package/external-consumer acceptance 需要同步；发布材料不得把成员事实表述为质量治理或 Check status。
- 验证需要覆盖重叠、零命中、空 selection、未知 query key、source 差异、filesystem 未跟踪文件、稳定排序、同 source 一次候选枚举、query 无 I/O 及失败不伪造结果；再以代表性 workload 比较线性、惰性和 eager 反向查询策略。

## Risks / Trade-offs

- inventory 选择由调用方定义。过窄的 include 或过宽的 exclude 不会自动成为“治理遗漏”；工具只提供可审计成员事实。
- 不同 source 会保留 Git ignore、untracked files、submodule 与 filesystem 的差异，也可能增加 acquisition 成本。
- 大型仓库中的索引与复制成本需要实测；filesystem collection 不跟随 symlink，也不提供跨查询后的内容或目录原子性。

## Open Questions

- 公开工具、输入字段和查询方法应如何命名，才能清晰区分 inventory、selection 与调用方 policy？
- `inventory` 是固定的 `{ include, exclude }` filesystem grammar，还是接受完整 selection 后严格拒绝非-filesystem source？
- selection IDs 采用普通 record keys 还是 ordered entries，才能同时明确顺序、原型安全和可用 ID 范围？
- 哪一种索引策略在代表性 source/path/membership 分布下足以满足首个实现？是否真的需要额外 helper，还是普通 TypeScript 查询已足够？
