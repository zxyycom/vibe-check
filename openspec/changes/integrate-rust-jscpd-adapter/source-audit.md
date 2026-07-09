# jscpd Rust 接入前置探索

最后检查日期：2026-07-09

本文是 `integrate-rust-jscpd-adapter` 的前置 source audit。后续实现直接消费本文结论；若 Cargo resolution、编译结果或 fixture 行为与本文冲突，先更新本文、`design.md` 和相关 spec delta，再继续实现。

## 结论

可以接入。推荐以 `cpd-finder = "0.1.8"` 作为第一版 Rust duplicate scanner adapter 的依赖入口，调用 `cpd_finder::orchestrate::{RunConfig, run}`。

方便程度：中等偏方便。上游 API 很薄，`RunConfig` 加 `run()` 就能跑出 `clones`，license 也匹配本仓库的 MIT；但要把它接成 Vibe Check 的稳定 scanner contract，并不是“一行依赖就完成”。

主要方便点：

- Rust API 已存在，不需要 shell out 到 `jscpd` / `cpd` binary。
- `RunResult.clones` 模型简单，能映射成 Vibe Check-owned duplicate finding。
- `RunConfig.paths` 可以传入 Vibe Check 已收集的 exact file paths，避免直接把 project root 丢给 jscpd 二次扫描。
- 当前 crates.io 版本可用，`cpd-finder` / `cpd-core` / `cpd-tokenizer` 都是 MIT。

主要成本和风险：

- upstream crates 要求 Rust `1.87`，本仓库没有显式 `rust-toolchain.toml`，需要接受或记录 MSRV 影响。
- `cpd-finder` 会走自己的 walker，并且可能静默跳过 walk error、open/mmap 失败、非 UTF-8 文件、低于阈值文件等；Vibe Check adapter 必须自己做 preflight 和 diagnostics。
- upstream `CpdClone` 是 pairwise clone，不是天然 N-location group；Vibe Check 需要自己定义 group identity 和排序。
- upstream source id 是 canonical path string，需要映射回 project-root-relative `/` path，Windows 下尤其要测试。
- `cpd-tokenizer` 会带入 `oxc_*` 等 transitive dependencies，编译时间和依赖体积需要作为接入成本接受。

推荐路径：继续推进第一版，但保持 duplicate warning 为 `medium`、non-blocking；先用 fixture 证明 scope、threshold、path normalization 和 error mapping，再考虑是否让 duplicate 影响 gate。

## 已验证来源

- jscpd Rust README: https://github.com/kucherenko/jscpd/blob/master/rust/README.md
- jscpd Rust API docs: https://github.com/kucherenko/jscpd/blob/master/docs/api.md
- jscpd Rust CLI docs: https://github.com/kucherenko/jscpd/blob/master/docs/rust.md
- jscpd packages docs: https://github.com/kucherenko/jscpd/blob/master/docs/packages.md
- `cpd-finder` crate metadata: https://crates.io/crates/cpd-finder/0.1.8
- `cpd-core` crate metadata: https://crates.io/crates/cpd-core/0.1.6
- `cpd-tokenizer` crate metadata: https://crates.io/crates/cpd-tokenizer/0.1.7
- `cpd-finder` source: https://docs.rs/crate/cpd-finder/0.1.8/source/src/orchestrate.rs
- `cpd-finder` walker source: https://docs.rs/crate/cpd-finder/0.1.8/source/src/walker.rs
- `cpd-core` model source: https://docs.rs/crate/cpd-core/0.1.6/source/src/models.rs
- `cpd-core` detection source: https://docs.rs/crate/cpd-core/0.1.6/source/src/detect.rs
- `cpd-tokenizer` format source: https://docs.rs/crate/cpd-tokenizer/0.1.7/source/src/formats.rs
- `cpd-tokenizer` tokenizer source: https://docs.rs/crate/cpd-tokenizer/0.1.7/source/src/tokenizer.rs

本地版本检查命令：

- `cargo search cpd-finder --limit 5` 返回 `cpd-finder = "0.1.8"`。
- `cargo info cpd-finder` 返回 version `0.1.8`、license `MIT`、rust-version `1.87`。
- `cargo info cpd-core` 返回 version `0.1.6`、license `MIT`、rust-version `1.87`。
- `cargo info cpd-tokenizer` 返回 version `0.1.7`、license `MIT`、rust-version `1.87`。

## 依赖结论

第一版依赖入口使用：

```toml
cpd-finder = "0.1.8"
```

依据：

- upstream 文档给出的 Rust application integration 是 `cpd_finder::orchestrate::{RunConfig, run}`。
- crates.io 当前可安装 `cpd-finder 0.1.8`。
- `cpd-finder` 依赖 `cpd-core` 和 `cpd-tokenizer`；当前观察到的相关版本是 `cpd-core 0.1.6` 和 `cpd-tokenizer 0.1.7`。
- 不需要接入 `cpd-reporter`；reporter output 不能成为 Vibe Check 稳定输出契约。

兼容性约束：

- upstream crates 使用 Rust edition `2024`，rust-version `1.87`。
- Vibe Check workspace 当前是 Rust edition `2021`，license `MIT`，没有 checked-in `rust-toolchain.toml`。
- 本次探索使用的本地工具链是 `cargo 1.96.0`，本地编译能力应满足 upstream MSRV；发布策略仍需接受 Rust `1.87+`。
- `cpd-tokenizer` 会引入 `oxc_*` parser 依赖；这是依赖体积和编译成本风险，不是 scanner 行为风险。

来源冲突处理：

- 旧 upstream README / packages 文本曾列出 `cpd-finder 0.1.4`。
- crates.io 和当前发布包 metadata 显示 `cpd-finder 0.1.8`。
- 本 change 以 `0.1.8` 为实现 target；`0.1.4` 只视为历史信息。

## Rust API 事实

程序化入口：

```rust
use cpd_finder::orchestrate::{RunConfig, run};

let result = run(&config)?;
```

`RunConfig` 字段：

- `paths: Vec<PathBuf>`
- `min_tokens: usize`
- `min_lines: usize`
- `max_lines: Option<usize>`
- `mode: cpd_tokenizer::tokenizer::Mode`
- `formats: Vec<String>`
- `ignore: Vec<String>`
- `code_ignore_patterns: Vec<String>`
- `max_size: Option<u64>`
- `no_gitignore: bool`
- `follow_symlinks: bool`
- `skip_local: bool`
- `blame: bool`
- `workers: Option<usize>`
- `ignore_case: bool`
- `formats_exts: HashMap<String, Vec<String>>`
- `formats_names: HashMap<String, Vec<String>>`
- `pattern: Option<String>`

与 Vibe Check 第一版相关的默认值：

- `min_tokens = 50`
- `min_lines = 5`
- `max_lines = None`
- `mode = Mode::Mild`
- `formats = []`
- `ignore = []`
- `code_ignore_patterns = []`
- `no_gitignore = false`
- `follow_symlinks = false`
- `skip_local = false`
- `blame = false`
- `workers = None`
- `ignore_case = false`
- `pattern = None`

`run(&RunConfig)` 返回：

```rust
pub struct RunResult {
    pub clones: Vec<CpdClone>,
    pub statistics: Statistics,
    pub sources: Vec<SourceFile>,
}
```

`FinderError` 只有粗粒度的 `Io(std::io::Error)` 和 `Other(String)`。

## Scope 接入规则

`cpd-finder` 一定会先调用自己的 walker。walker 接收 `RunConfig.paths`，对每个 path 建 `ignore::WalkBuilder`，当 entry 是 file 且能识别 format 时才进入后续 tokenization。

Vibe Check adapter 的接入规则：

- 传入 Vibe Check 已收集的 supported files，作为 individual `paths`。
- 不把 project root 传给 jscpd。
- 第一版 `formats` 固定为 `["typescript", "go", "rust", "python"]`。
- `ignore` 为空，因为 include / exclude / generated / vendor / cache 已由 Vibe Check scan scope 负责。
- `no_gitignore = true`，避免 jscpd 在 Vibe Check scope 之后再次应用 `.gitignore`。
- `pattern = None`，第一版不用 jscpd positive glob filtering。
- `follow_symlinks` 应与 scan scope collector 保持一致；如果当前 model 没有该字段，先保持 jscpd default `false` 并记录限制。
- `blame = false`，因为 blame 不属于第一版 duplicate finding model。

exact-file-list 策略可行，但必须用 fixture 证明。原因是 jscpd 仍会做 format detection、size filtering 和 token threshold filtering。

语言映射：

- Vibe `typescript` / `.ts` -> jscpd `typescript`
- Vibe `go` / `.go` -> jscpd `go`
- Vibe `rust` / `.rs` -> jscpd `rust`
- Vibe `python` / `.py` -> jscpd `python`

不要因为 jscpd 支持更多扩展就扩大 Vibe Check supported source set。例如 `.mts`、`.cts`、`.pyx`、`.pxd`、`.pxi`、JS/JSX/TSX、Markdown、Vue、Svelte、Astro 都不应进入第一版 duplicate scanner input，除非 scan scope 另有 change。

## Threshold 和 tokenization 事实

- `min_tokens` 是主要 clone window threshold。
- `min_lines` 使用 `fragment_a.end.line - fragment_a.start.line >= min_lines`，不是直觉上的“源码行数”。fixture 断言要围绕真实 line span 校准。
- `max_lines` 在 UTF-8 decode 前过滤文件；第一版保持 `None`，除非 Vibe Check owner 定义该设置。
- `Mode::Mild` 是默认模式，会忽略 whitespace 但保留 comments。第一版不要为了显式写 `Mode::Mild` 而直接依赖 `cpd-tokenizer`；能用 `Default` 就用 `Default`。
- `ignore_case` 第一版保持 `false`。
- `code_ignore_patterns` 中的非法 regex 会被 upstream 静默跳过；Vibe Check 不应在没有自有校验和 diagnostics 前暴露该配置。

## Result model 事实

`cpd-core 0.1.6` 的 clone 是 pairwise 模型：

```rust
pub struct CpdClone {
    pub format: String,
    pub fragment_a: Fragment,
    pub fragment_b: Fragment,
    pub token_count: u32,
}

pub struct Fragment {
    pub source_id: String,
    pub start: Location,
    pub end: Location,
    pub range: [u32; 2],
    pub blame: Option<BlameEntry>,
}

pub struct Location {
    pub line: u32,
    pub column: u32,
    pub offset: u32,
}
```

归一化规则：

- 第一版可把每个 `CpdClone` pair 视为一个 Vibe Check duplicate group；除非实现显式增加 deterministic graph coalescing。
- 不要声称 upstream 返回 native N-location clone groups。
- 将 `fragment_a.source_id` / `fragment_b.source_id` 从 canonical path string 映射回 project-root-relative `/` path。
- 无法映射回 project root 的 clone fragment 必须被拒绝或产生 diagnostic。
- 保留 `start.line`、`end.line`、`start.column`、`end.column` 作为 location evidence。
- `Fragment.range` 是 token index range，不是 byte range。
- `CpdClone.token_count` 可作为 threshold evidence。
- `format` 默认留在 adapter 内部，除非 Vibe Check-owned model 需要它做测试诊断。
- 不把 `Statistics`、`SourceFile`、`Token`、reporter output 或 raw jscpd JSON 暴露到稳定输出。

确定性规则：

- `cpd-core` 会按 `(fragment_a.source_id, fragment_a.start.line, fragment_b.source_id, fragment_b.start.line)` 排序。
- Vibe Check 仍必须在 path normalization 后自行排序，因为 Windows path separator、canonicalization 和 project-relative conversion 都属于 Vibe Check 边界。

## Error 和 diagnostic 事实

upstream 行为：

- `walk()` 忽略单个 walk entry error 并继续。
- nonexistent path 可以返回成功的空结果。
- `run()` 会静默跳过 open 失败、mmap 失败、UTF-8 decode 失败、低于 line threshold、display token 不足、detection token 不足的文件。
- 非法 `code_ignore_patterns` 会被静默跳过。
- `run()` 会创建 local rayon thread pool；只有两次 thread-pool build 都失败时才可能通过内部 `expect` panic。

adapter 影响：

- 不能把 `RunResult { clones: [], ... }` 当成 scanner 完整成功的证明。
- 调用 jscpd 前做 Vibe Check-owned preflight：文件仍存在、是 file、可读、按 owner 预期可 UTF-8 decode。
- 低于 threshold 是正常 no-finding，不是 diagnostic。
- `FinderError` 在无法信任 duplicate report data 时映射为 scanner fatal error。
- 若单文件 preflight 问题可恢复且仍能生成其它 scanner data，输出 duplicate scanner diagnostic，并让 report 进入 partial。
- 若所有 duplicate scanner input 在调用前都不可用，返回显式 duplicate scanner diagnostic 或 unsupported outcome，不能静默报 clean。
- 如需把 scanner panic 纳入稳定错误边界，可在 adapter 层包一层 panic containment。

## 推荐第一版 `RunConfig`

```rust
let config = RunConfig {
    paths: supported_file_paths,
    min_tokens: duplicate_min_tokens,
    min_lines: duplicate_min_lines,
    max_lines: None,
    formats: vec![
        "typescript".to_string(),
        "go".to_string(),
        "rust".to_string(),
        "python".to_string(),
    ],
    ignore: vec![],
    code_ignore_patterns: vec![],
    max_size: None,
    no_gitignore: true,
    follow_symlinks: scan_scope_follow_symlinks,
    skip_local: false,
    blame: false,
    workers: None,
    ignore_case: false,
    formats_exts: Default::default(),
    formats_names: Default::default(),
    pattern: None,
    ..Default::default()
};
```

如果 Rust 因字段已全部指定而不接受 `..Default::default()`，移除 struct update。不要仅为设置默认 `mode` 而新增直接 `cpd-tokenizer` 依赖。

## Fixture 证明目标

实现测试必须证明：

- 传 individual file paths 能产生 duplicate findings，不需要传 project root。
- adapter 不使用 project root 作为 jscpd scan path。
- Vibe Check scan scope 排除的文件不会进入 `RunConfig.paths`。
- `.ts`、`.go`、`.rs`、`.py` 正确映射到 `typescript`、`go`、`rust`、`python`。
- `.mts`、`.cts`、`.pyx`、`.pxd`、`.pxi`、JS/JSX/TSX、Markdown、Vue、Svelte、Astro 不进入第一版 input。
- `no_gitignore = true` 能避免 jscpd 对 Vibe Check 已批准的 exact paths 再应用 `.gitignore`。
- threshold 行为尊重 `min_tokens` 和 `min_lines`。
- pairwise `CpdClone` 能归一化为稳定 Vibe Check duplicate findings。
- canonical absolute `source_id` 在 Windows 和 Unix 上都能转为 project-root-relative `/` path。
- missing、unreadable、non-UTF-8、post-collection-deleted 文件会产生显式 diagnostics 或 fatal errors，不会被当成 zero duplicates。

## Apply 阶段复查条件

Apply 阶段可以做 Cargo resolution、编译、fixture tests 和 local diff validation。这些是实现验证，不是大范围上游探索。

只有以下情况才重新打开 upstream source exploration：

- `cpd-finder = "0.1.8"` 已无法解析，或 Cargo 解析出的 public API 不兼容。
- 下载到本地的 crate source 与本文列出的字段或模型冲突。
- 编译证明需要本文未记录的 direct dependency 或 feature flag。
- fixture tests 证明 individual-file `paths` 无法保持 Vibe Check scan scope。

若发生上述情况，先更新本文，再更新 `design.md`、`tasks.md` 和相关 spec delta，然后再继续写实现代码。
