# Design

本设计把“知道本次 Run 实际使用了哪些路径”和“获得一个可写目录能力”分成两个问题。前者可由 Product 现有 invocation state 派生；后者必须由 caller 显式选择并声明 lifecycle，不能从相邻 output 猜测。

## Context

- `CheckExecutionContext` 当前包含 `dependencies`、prepared `options`、`project`、`records` 与 `signal`；`project` 只有绝对 root 和 canonical flags。
- invocation creation 已在任何 Check work 前确定 invocation ID、effective outputs、absolute project root 与 diagnostic log target；machine directory 当前只在完成发布时从相同 effective configuration 解析。
- machine publication 与 diagnostic logging 是独立配置、独立状态和独立失败边界；两者可以指向同一目录，但目录相同不会合并 owner。
- Repository Gate 目前在 Product 外创建 invocation directory，并通过 RunControls 把 Product outputs 指向该位置；Check-owned process transcripts 仍需 Gate adapter 通过闭包或项目模块另行传递目录。
- aligned Decisions 要求 RunControls 只承载 Product 能统一解释的 invocation control，保留 machine canonical file ownership，并禁止把 Check settlement、progress、machine 与泛化 effect owner 合并。
- standalone `cacheJsonByKey(...)` 要求 caller 提供 absolute persistent state directory；一次性 Run output directory 不能自动满足跨 invocation cache lifecycle。

## Goals / Non-Goals

**Goals**

- 让 callback 读取与实际 Run 一致、预先解析且冻结的 path facts，不再自行合并 Definition 与 RunControls。
- 明确 disabled output、absolute/relative authoring path、invocation-specific file 与 directory 的观察语义。
- 若真实 consumer 需要写 Check-owned artifacts 或 persistent state，以独立 capability 表达 lifecycle、namespace 和 collision boundary。
- 保持 path exposure 不改变 Check result、Record、message、output status 或 cancellation contract。

**Non-Goals**

- 不把 machine、diagnostic、cache 与任意 Check side effect 合并为一个 generic output owner。
- 不向 Check 暴露 diagnostic logger、machine publisher、scheduler internals 或修改 Run output configuration 的能力。
- 不承诺 filesystem sandbox、containment、directory cleanup、quota、remote storage 或跨 Check 自动协调。
- 不因 path 可见就允许写 `run.json`、`records.ndjson`、diagnostic log 或其它 Product-owned文件。

## Decisions

### Intended Change

以下方向在 Plan 前仍需用真实 consumer 闭合 writable path 的最小集合：

1. 在 `CheckExecutionContext` 增加冻结的 invocation path view，由 Product 在 callback assembly 前一次构造。它只包含 absolute effective paths，不把 Definition 中的原始相对字符串交给每个 Check 重复解析。
2. output path facts 至少区分 machine publication directory 与 diagnostic logging directory/file，并显式表示对应 output 是否 enabled；两个目录可以相同，但仍是不同字段。
3. output path facts 默认为只读观察值。Check 不得把 machine canonical files 或 diagnostic log 当作自己的写入目标；仅需关联证据的 custom Check 应写入 caller-owned namespaced child path，而不是复用 Product 文件名。
4. 不从 machine 或 diagnostic directory 推断 persistent cache directory。若内置 cache adoption 需要公共 state path，必须由 caller 选择具有 cross-run lifecycle 的 state directory，并在 RunControls、Definition 或 Check options 中选定一个唯一 owner 后再进入 Plan。
5. 只有存在至少一个不能仅靠 output facts 安全完成的生产 consumer 时，才增加通用 writable workspace。该字段必须说明是 per-invocation 还是 cross-run、是否要求 caller 预建、冲突如何处理以及失败由谁结算；不预先加入任意 path map 或通用 effect registry。
6. 现有 `project.root` 保持项目文件解析 owner；新 path view 不改变 file selection、root containment 或 Check-specific options。

### Resulting Impacts

- `src/check/check.ts` 与 package declaration projection需要增加最小 public type；callback assembly、invocation creation 与测试需要证明所有 Check 观察到同一份 effective absolute facts。
- output configuration resolution 需要形成一次共享的 resolved representation，避免 diagnostic 在 creation、machine 在 completion、callback 在 execution 各自重复解析并产生差异。
- Definition/RunControls schema、fingerprint 与兼容性只在新增 writable workspace/state authoring field 时受影响；纯派生 output facts不应扩大 authoring surface。
- API、configuration、architecture 与 output 文档需要明确 path discovery、disabled branch、write ownership及 cache lifecycle，并提供 custom Check 使用示例。
- Tests需要覆盖 relative/absolute target、RunControls override、相同目录、disabled output、diagnostic file identity、并发 Checks只读一致性，以及禁止把 Product-owned filenames描述为公共写入面。
- 该公共契约若改变现有 aligned Run-input 或 output-owner Decisions，必须在 Plan 前完成对应 Decision evolution；Change Draft 本身不修改长期决策。

## Risks / Trade-offs

- callback 根据 output enablement 改变领域结算会把 presentation/publication concern反向耦合进 Check；文档与示例必须把路径用于副作用定位，而不是业务判定。
- 暴露 absolute path 会向 author callback揭示 caller 已经授权给同一进程的本地位置；这是同进程 capability 的可发现性扩展，不是新的 filesystem sandbox。
- writable workspace 若没有 Check namespace会产生并发覆盖；若自动创建过多层级，又会把 Product 变成任意 artifact manager。
- persistent state 与 per-invocation artifacts 若使用同一字段，cleanup 与复用语义必然冲突，因此不能为了字段少而合并。

## Open Questions

- 首个生产 consumer 只需要读取 effective machine/diagnostic paths，还是还需要 Product 保证一个 Check-owned writable workspace？
- 若需要 workspace，它是每次 Run 唯一目录，还是由 caller 提供 base directory 后由 Product 用 invocation ID 建子目录？
- cross-run state directory 应属于普通 Run context、各 Check options，还是继续由使用 `cacheJsonByKey(...)` 的 caller闭包拥有？
- output disabled 时应暴露 configured absolute target 加 `enabled: false`，还是将 target 表达为 `null`；哪个形状最不容易让 Check误写未启用 output？
