# Proposal

本 Draft 评审在 `CheckExecutionContext` 中提供一次 Run 的有效路径事实，让 custom 与内置 Check 能发现调用方已经选择的 invocation 位置，而不靠闭包、重复解析配置或约定相同字符串来保持一致。

## Why

Product 在 Check execution 前已经合并 Definition 与 RunControls，并解析 effective `projectRoot`、machine publication directory、diagnostic logging directory 和 invocation-specific diagnostic file；callback 目前只能读取 `project.root` 与 flags。项目若要让 Check-owned process transcript、临时产物或其它受控副作用跟随同一次 Run，只能在 Product 外再次传递和解析路径，容易与实际 override 不一致。

路径可发现性不等于目录 ownership。machine publisher 只拥有 canonical machine files，diagnostic logger 拥有自己的 log file，持久 cache 又要求跨 Run 的 state lifecycle。若只向 callback 暴露一个模糊的 `outputRoot`，Check 可能覆盖 Product 文件、把一次性 invocation 目录误作 cache，或让是否启用 presentation output 改变领域结算。

## Outcome

Check callback 从冻结的 invocation context 读取 Product 已经确定的绝对路径事实，并能区分 Product-owned output target、调用方明确提供的 Check artifact workspace 与可选 cross-run state。字段缺失或 output disabled 的语义明确；任何 writable path 都有独立 owner、配置入口和冲突规则，且不改变 machine publication、diagnostic logging、Check settlement 或 cache failure 的现有责任边界。
