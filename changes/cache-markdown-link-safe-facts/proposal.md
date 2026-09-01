# Proposal

本 Draft 为大型文档库评审 Markdown Link Check 的内容寻址缓存和单次运行 memoization，在不缓存最终 Finding 或 Check settlement 的前提下降低重复解析成本。

## Why

`markdownLinkValidation` 当前每次运行都读取并解析全部选中的 Markdown source；跨文档 anchor target 也可能因多个 occurrence 被重复读取和解析。这个成本在本仓库不突出，但在包含上千 Markdown 文件、链接高度复用或 CI 频繁重复运行的项目中可能主导 Check 时长。

Package 已提供 caller-keyed canonical JSON cache mechanics，但没有内置 Check 使用它。直接缓存整个 Markdown Check 结果不安全：目标存在性、symlink containment、目录状态、anchor、options 和文件集合可以独立变化；现有 parsed facts 还包含 raw destination 与 heading slug，不能未经安全评审直接持久化。

## Outcome

在大型与增量 corpus 的基线证明收益后，Markdown Link Check 只复用经过安全投影、parser-versioned 且由内容 hash 标识的私有 parse facts，并在同一次 invocation 内合并重复 target 读取/解析。每次 Check 仍重新完成 source selection、目标授权与状态验证、Finding/Record 形成和 terminal settlement；缓存缺失、损坏或 I/O 失败降级为正常解析，不把过期 Finding 伪装为当前事实。
