# Rust 补丁对比的实验依据

本资源承接同轮调查的实验细节，供复核报告中的数字与因果解释。采用判断以[调查正文](../../261107-assess-rust-analyzer-user-patch.md)为入口。

## 来源与对比方法

- 基线：`main` 的 `31230d00fec0b0644daa95f332ebe792fd378af0` 源码。
- 输入：用户粘贴补丁，原文 SHA-256 为 `00283c70e827b437be52128bbc336343703652c9c61263d724bd2e1b95cddfa6`。
- 保留范围：`candidate-rust.patch` 原样节选三个 Rust 相关 TypeScript 源文件 diff 段，省去 Markdown 与重复构建产物段。
- 调用链：读取 `rust.ts`、`golike.ts`、`lizardnd.ts`、`code-reader.ts`、`pipeline.ts` 与 `port-facade.ts`，
  通过产品私有入口 `analyzeLizardSource` 分析，沿用 `complextags`、`nd` 扩展。
- 实验隔离：Node `24.18.0` 分别启动基线与候选进程。候选用 load hook 在内存中替换三个源文件，
  按原文上下文唯一匹配各 hunk；工作区 Product 源码和构建产物保持原样。
- 输出：`results.json` 保存两侧完整样本、函数位置、CCN、ND、参数数与贡献列表，保留本轮取得的结果快照。

## 样本与解释

下表样本名对应驱动和 JSON 中的 `name`；输入正文见这两个资源。
参数数与函数身份的预期由签名和正文直接确定，ND 的语义选择按公开契约单独判断。

| 样本 | 基线 → 候选 | 依据与解释 |
| --- | --- | --- |
| `errorPropagation` | ND 3 → 0，CCN 保持 4 | 基线通用 nesting 规则将三个 `?` 累计为嵌套；候选从 Rust 的 nesting token 集合移除 `?`，保留 CCN 贡献。 |
| `shortCircuit` | ND 1 → 0，CCN 保持 2 | 候选跳过 Rust `&&`/`||` 的 ND 路径。公开 ND 本非纯大括号深度，这一变化需要计量口径判断。 |
| `nestedParameters` | 参数数 5 → 3 | 基线把类型内部逗号计入分隔；候选过滤嵌套分隔后得到三个顶层参数。 |
| `traitDeclaration` | `required` → `defaulted` | 基线等待正文时跨过声明分号，误将后续方法正文归给前一个名称；候选在分号处结束该声明。 |
| `rawString` | CCN 1 → 2，ND 0 → 1 | 基线 escaped-string 规则把 raw literal 的反斜杠当作转义，吞掉字符串后的 `if`；候选优先消费 raw literal。 |
| `functionPointer` | 多出空名函数 → 仅 `outer`，其 CCN 2 → 3 | 基线把类型位置的 `fn(` 当作声明；候选的名称前瞻避免创建该假函数。 |
| `unicodeName` | 一个函数 → 零结果 | 候选 `_rust_function_name` 的 ASCII 正则拒绝 tokenizer 原本可提供的 Unicode 名称，导致全部函数指标漏检。 |
| `rawIdentifier` | 两侧均为零结果 | tokenizer 将 `r#type` 拆成 `r`、`#`、`type`；候选名称正则的可选 `r#` 未覆盖实际 token 流。 |
| `splitDeclaration` | 起始行 1 → 2 | 候选延迟到名称 token 才创建 FunctionInfo，起始行由 `fn` 行移到名称行。 |
| `constComparison` | 参数数 2 → 1 | 候选 `genericDepth` 把 const 比较的 `<` 当作泛型打开符，离开 `[]`/`{}` 后仍未归零，随后顶层逗号也被过滤。 |

两处易误读的完整输入如下。

原始字符串以反斜杠结束；后续 `if` 位于字符串外：

```rust
fn raw() { let s = r"ends with \"; if true { println!("ok"); } }
```

const 比较位于第一个参数的数组长度表达式中；签名共有两个参数：

```rust
fn f(x: [u8; { if 1 < 2 { 1 } else { 2 } }], y: u8) {}
```

## 复核命令与验证记录

以下命令在仓库根运行。对比驱动将结果输出到 stdout，核验时可与已保存的 `results.json` 比较。

```sh
mise exec -- node docs/investigations/_resources/261107-assess-rust-analyzer-user-patch/compare-rust-patch.mjs
```

本轮使用 `rustc 1.98.1`、edition 2024 验证十个片段可共同编译。只增加下列上下文补齐引用，保持样本正文原样：

```rust
#![allow(dead_code, unused_variables, unused_braces)]
type E = ();
fn a() -> Result<(), E> { Ok(()) }
fn b() -> Result<(), E> { Ok(()) }
fn c() -> Result<(), E> { Ok(()) }
```

将上述上下文与 `results.json` 中 `baseline[*].sourceCode` 按顺序连接，作为 stdin 传入：

```sh
rustc --edition=2024 --crate-type lib --emit=metadata=- - > /dev/null
```

Bun `1.4.4` 下运行以下八个既有测试，全部通过；覆盖基线的 Go-like oracle/语言场景和 Markdown 缓存行为：

```sh
bun test \
  src/package-checks/function-metrics/analyzer/readers/golike-readers.test.ts \
  src/package-checks/markdown-lint/findings-cache.test.ts
```

Markdown 缓存源码已通过 `getVersion` 读取版本并以 `unknown` 检查结果，实际返回 `0.42.0`；
既有测试覆盖冷/热缓存及版本不可用时的行为。上述测试成功与 Rust 反例可复现同时成立，故它们尚未提供新增边界的回归保护。
