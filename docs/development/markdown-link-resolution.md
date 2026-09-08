# Markdown Link 解析与目标授权

本文拥有 `src/package-checks/markdown-link-validation/**` 中 source parse facts、direct-target 授权与 parse-facts cache 的内部不变量。修改 resolver、parser adapter 或 storage lifecycle 时使用；公开配置、occurrence 和安全承诺由[Markdown Link Check 指南](../checks/markdown-link-validation.md)定义。共享 source 收集和 exact membership 见[Project files](project-files.md)。

## Markdown Link source occurrences

Link Check 先将 project root canonicalize 一次。失败即为 `unavailable`；只有 root 已 canonicalize 且没有 eligible
Markdown source 时才是 `not-applicable`。每个 eligible source 只 decode 和 parse 一次，得到 Link-private facts。
受支持的 occurrence 是 inline link/image、在 use site 已定义的 full/collapsed/shortcut reference、explicit autolink
和选定的 GFM autolink literal。YAML front matter、code/fenced code、HTML attribute、prose URL 和 undefined reference
不创建 occurrence。

这些 facts 是 immutable 的 Link-private adapter output。decode 或 parser 失败使 Check 结算为 `unavailable`，而不是发布
partial occurrence set。anchor lookup 时，每份文档以 ATX 和 Setext heading 创建新的 GitHub-priority slugger。source
navigation range 使用 decode 后 JavaScript UTF-16 position，line/column 为 one-based、end-exclusive；parser offset 和
dependency AST 保持 private。

这些 immutable facts 可由本 Check 的[parse-facts cache](#markdown-link-parse-facts-cache)复用；
cache 的恢复、当前 bytes 校验与 terminal publication 仍由同一 Link-private owner 承接。

## Markdown Link direct targets

Markdown Link Check 只能对 source occurrence 的 direct local target 做 bounded work。lexically 位于 project root 内的
target 即使不属于该 Check 的 source selection 也可被检查，但绝不成为 source input。启用 cross-document fragment 后，
只有可读取的 regular Markdown target 才提供 heading facts；directory 永不接受 anchor lookup。配置 directory
non-empty checking 后，最多读取一个 entry，绝不递归枚举。

relative lexical escape、host-native absolute path 和接受的 raw host-native empty-authority `file:///` local URI，在
target I/O 前进入 Check 的 `rootExternalTargetMode`。`ignore` 不产生 finding，也不做 root 外 work；`report` 产生安全的
`target-outside-project-root` finding，也不做 root 外 work；只有 `validate` 可对该 target 做 bounded direct work。
lexically root-in candidate 只能使用 component containment probe。若某个 symlink hop 越出 root，除 `validate` mode 外，
该 probe 不授权触碰 root 外 referent。

containment guarantee 依据操作期间观察到的 host filesystem state 判断。Node path/filesystem API 不提供 portable dirfd/openat
traversal，因此 component probe 成功后的 hostile concurrent replacement 不在本 Check 的 authorization proof 范围内。
regular-file read 仍使用 no-follow final-leaf opening 和 byte bound；需要 hostile-filesystem isolation 的调用方应使用
OS-level sandbox。

HTTP(S)、`mailto:`、protocol-relative URL、UNC path、带 authority 或不受支持的 `file:` form 以及其它不受支持的 target
form 只分类后停止。它们不产生 Product-owned DNS、HTTP、TLS、redirect、subprocess 或 filesystem I/O，也不产生
external reachability verdict。本 Check 没有 target discovery、crawler、shared resolver 或 general file-policy surface。

## Markdown Link parse-facts cache

`src/package-checks/markdown-link-validation/parse-facts-cache.ts` 拥有每次 resolver invocation 的恢复、命中与
publication；payload grammar 由相邻 `parse-facts-cache-payload.ts` 拥有。调用方配置、收益和存储安全边界见
[Markdown Link Check 指南](../checks/markdown-link-validation.md#parse-facts-cache)。

启用后，session 首次需要 facts 时只读取一次 `<directory>/markdown-link-parse-facts-v1.jsonl`，以同一个 Promise
串行化恢复。完整、有效的 JSONL lines 恢复成 invocation-local Map；malformed、unknown-version 和未以 newline
结束的尾行不进入 Map，同 identity 以最后一条有效 line 为准。missing file 等同空 cache；其它整文件读取或 UTF-8
解码失败同时关闭本次 publication，防止在未知材料后继续追加。

每次 lookup 前仍按当前授权读取 source/target exact bytes 并验证 UTF-8。identity 绑定 source bytes 的 SHA-256，
payload 验证绑定 parser contract 与版本；命中只复用 Link-private occurrences、headings 和 decoded ranges。
input discovery、target authorization/probe、Finding/Record 与 settlement 每次重新执行。

fresh parse 成功后将 facts 放入 dirty Map；terminal boundary 调用幂等 `finalize`，至多一次 awaited append 发布
完整 dirty block。开始 publication 前和 mkdir 后都检查 cancellation；append 一旦开始就等待完成，不启动后台写入。
观察到旧 partial tail 时先追加 newline 隔离它。publication failure 被包含，只影响未来复用，不改变 Check facts。

此 session 是 best-effort 单次调用状态，不建立跨进程锁、原子事务或持久性保证。并发 append 的损坏或重复 lines
依照相同恢复规则退化为 miss；目录容量与清理由调用方管理。修改 storage 时同步核查相邻 lifecycle 与 payload tests。

## 验证

修改 parser/probe/cache 时运行相邻单元与 Check integration tests，分别核对 immutable occurrence/range、no-follow 与 root-external 授权、当前 bytes 校验、恢复/终态写入和取消。cache 命中不能跳过授权或改变 Findings/settlement；共享收集测试不能代替这些 resolver 证据。
