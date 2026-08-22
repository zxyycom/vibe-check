# Proposal

本 Change 以两个不可互相替代的主要结果进入 Plan：让 Check 在结束时附带可呈现、可由调用方读取的结构化消息，以及让 Check 显式声明 human visibility；二者组合产生的归属与展示一致性是衍生问题，不取代任何一个主要问题。

## Why

### 主要问题一：Check 缺少明确归属且可程序化读取的终态消息

当前 Check 以四态结果结束，主 final data、supplemental Records、Core snapshot 和 machine v4 已能保存结构化质量事实；Product-owned progress 却只显示 Check 名称、状态、耗时和受控 reason。部分 producing Check 已经知道一段安全、可行动的人读提示，却没有正式接口把它与稳定 code、显示 level 一起交给 Product 和 package caller；没有这类提示的 Check 不需要改变返回内容。

并行 Check 在运行中直接写共享终端会破坏消息归属、settlement 顺序和 TTY cursor ownership。等待 Check 结束再显示没有产品损失，因此 Check 随四态 terminal return 原子附带结构化 messages，Product 只在 owning Check settlement 时输出；同一 messages 无论 progress 是否启用都进入 `RunResult`，避免“终端显示过但调用方不知道”。

### 主要问题二：Check 缺少显式 human visibility

Supporting Check 可能只为下游 Check 产生输入，但它仍是有完整 lifecycle、outcome 和 duration 的普通 Check。当前 renderer 默认永久显示每个 settled Check，又没有声明式方式表达“成功且无消息时不保留永久行”。依赖关系、名称、Record 数量或 final data 都不能可靠替代这项意图。

Visibility 的 public authoring、默认行为、TTY running row、四态 settled matrix、accounting 和 Definition fingerprint 共同组成第二个主要结果。它不是消息能力的开关，也不由 typed dependency Change 负责。

### 衍生问题：消息与 visibility 必须保持同一个可见 owner

两个主要能力组合后，visibility 可能隐藏拥有消息的 Check。附带消息就是希望被看见，因此任何 messages 都必须保留 owning settled block；renderer 不能丢弃消息或输出无法判断所属 Check 的孤立文本。

## Outcome

1. **主要结果一——结构化终态消息：** 四态 author `CheckResult` 可通过可选 `messages` 附带零到多条 `{ level, code, message }`；level 为 `info | warning | error`，code 使用 kebab-case，message 是非空实际文本。
2. **主要结果一——settlement-only：** Check 不获得 live/intermediate writer；Product 只在 owning Check settlement 时输出消息，并保持同一 Check 的 message block 连续。
3. **主要结果一——程序化 readback：** 合法 messages 无论 progress 是否启用都进入 final-snapshot `RunResult.checkMessages`，以 owning `checkId` 和 level/code/message 供 package caller 读取；不进入 Core、Records 或 machine publication。
4. **主要结果一——一致边界：** Message attachment 复用现有 closed runtime validation；任一结构或类型非法时，整个 author terminal result 按 invalid-result boundary fail closed。本 Change 不增加同级 author result 没有采用的任意数量/长度 hard cap；合法消息的 writer failure 仍只影响 progress effect。
5. **主要结果二——显式 visibility：** Executable Check 的 `visibility` 缺省为 `always`；`attention` 仍显示 TTY running row，但只隐藏最终 `passed` 且无 messages 的永久行。
6. **主要结果二——事实与 identity：** Hidden Check 仍参与全部 lifecycle、outcome、duration、ordinal、final counts 和 structured facts；visibility 属于 declarative Definition metadata并参与 fingerprint。
7. **衍生结果——归属：** 任意 messages 都强制显示 owning settled row；row 与 messages 写完后才重绘 TTY running region。

## Scope

### Included

- 扩展四态 author `CheckResult.messages`，使用 supporting declarations `CheckMessageLevel`、`CheckMessage` 与 `CheckResultMessages`；不新增 package-root named type export。
- 在 runtime boundary 复用或泛化项目已有的安全 snapshot、closed validation 与 hostile-input containment，并分离 canonical outcome 与 messages；invalid attachment 走现有 invalid-result containment，不建立消息专属 trust model。
- 为所有带 final snapshot 的 `RunResult` 增加 canonical frozen `checkMessages`，progress disabled 或 writer failed 时也保留。
- 添加 `visibility?: "always" | "attention"`，闭合 executable-only Definition validation、default normalization、fingerprint 和 generated declarations。
- 为 TTY、plain 和 dumb terminal 实现 level-aware message presentation、visibility matrix、连续 settled block、控制字符转义和 writer failure isolation。
- 让确有补充提示的现有 Check 按需采用能力；Project Gate process Check 在 nonzero command failure 时附带唯一 `command-failed` message，只包含 exit code、signal 和 transcript basename。
- 同步 Configuration、Output、quality/result owners、public package inventory、相邻 Change 导航和语义测试证据。

### Excluded

- Live/intermediate output、Check-owned stream writer、buffered collector、stdout/stderr tee、public lifecycle observer、event sink 或 custom renderer。
- 从 final data、Records、Record ID/count、dependency output、日志文本或 child process line 自动推断 messages。
- 把 messages 加入 CheckOutcome、Core、Records、dependency、aggregation、cache 或 machine publication。
- 用 visibility 跳过 Check execution、prepared/started/settled lifecycle、duration measurement、RunResult 或 final summary accounting。
- Durable logs、Gate receipt/event protocol、retention、cleanup、typed dependency getter 或 registry publish。

## Success Criteria

### 主要问题一：结构化终态消息

- Public types 与 runtime 共同接受四个 author-return terminal branches 的 omitted/undefined/empty、单条和多条合法 messages；closed shape、dense array、level enum、kebab-case code、非空 message 和 hostile descriptors均按精确契约 fail closed，不使用数量/长度配额拒绝 otherwise valid messages。
- 并行、TTY、plain 和 dumb-terminal evidence 证明 messages 只在 owning Check settlement 后出现，level 在彩色输出中驱动强调且在无色输出/`RunResult` 中仍可解释。
- Progress enabled 时无法单独抑制合法 messages；progress disabled 时不创建 progress writer，但 final-snapshot `RunResult.checkMessages` 仍按 canonical Check order和author item order完整返回。
- Invalid attachment 使整个 author result 进入 existing invalid-result containment且不泄漏 partial messages；valid attachment 的 writer failure 只使 progress effect 失败，不改写 outcome、Records 或 `RunResult` messages。
- 现有 Check adoption evidence 证明没有 messages 的 Check 行为不变、有 messages 的 Check 才附带输出；Project Gate nonzero failure只显示并返回批准的 `command-failed` 摘要，并证明 stdout/stderr、完整路径和 transcript 内容不进入 progress或`RunResult`。

### 主要问题二：Check visibility

- 缺省 visibility 在 TTY/plain/dumb-terminal 中保持当前所有 Check 直接展示的行为。
- 非默认 attention visibility 在 TTY 仍显示临时 running row，只隐藏最终 `passed` 且无 messages 的永久 row；其它四态组合和任何 messages 都显示。
- Hidden Check 仍计入 prepared total、settlement ordinal、duration、final counts，并完整保留 lifecycle、RunResult、Core、Records、dependency 和 machine facts。
- `visibility` 只允许 executable Check声明，omitted/undefined规范为`always`，container或其它值在Definition boundary fail closed；omitted与显式`always` fingerprint相同，`attention`不同。

### 衍生问题：组合与归属

- 任意带 messages 的 Check 都显示 owning settled row，即使它使用非默认 visibility 且 outcome 为 `passed`。
- Settled row 与全部 message items 一起写完后才重绘 TTY running region；任何可见消息都能仅凭相邻输出确定 owner。
- 无 messages 的 Check 不产生 fallback presentation；Product 不把 arbitrary structured facts 猜成文本。

## Affected Owners

- [`docs/configuration.md`](../../docs/configuration.md)：Check authoring、closed Definition validation、terminal result 与 visibility contract。
- [`docs/output.md`](../../docs/output.md)：human progress、`RunResult` message readback、machine v4 非目标和 TTY/plain 输出。
- [`docs/quality-metrics.md`](../../docs/quality-metrics.md)：final data、Records 与 structured messages 的责任分离。
- [`src/product/definition/**`](../../src/product/definition/)：public types、closed keys、normalization、fingerprint 和 declarations。
- [`src/product/run/**`](../../src/product/run/)：`check-terminal-result` adapter、Core acceptance handoff、lifecycle feedback、`RunResult.checkMessages`、progress effect 与 renderer。
- [`scripts/quality/project-gate/**`](../../scripts/quality/project-gate/)：当前具有安全 terminal message 需求的具体 Check 与 transcript 边界。
- Public package inventory/candidate、isolated consumer、相关测试与语义 Case owner。
- [`changes/active-change-portfolio.md`](../active-change-portfolio.md) 与相邻 typed dependency、Gate authoring、log evidence、package documentation Changes：只同步依赖和 handoff，不转移两个主要结果。
