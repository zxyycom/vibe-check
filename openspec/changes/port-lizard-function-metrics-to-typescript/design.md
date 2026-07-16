本 design 采用逐文件对照翻译，把 Lizard 1.23.0 的产品所需源码合并到 TypeScript quality tooling，并删除正式扫描路径中的 Python runtime。

## Context

当前 function-metrics adapter 执行 python -m lizard --csv，再把 CSV 转成 Vibe Check 的 FunctionMetric。前置 change productize-typescript-quality-tooling 负责固定四语言输入、指标归一化和产品输出；本 change 只替换其 backend。

翻译基线为 terryyin/lizard tag 1.23.0、commit 06284ec87c1966fee4ddbf3f068ccf89b987b0f8。

## Goals

- 正式扫描只运行 Bun/TypeScript，不再需要 Python 或 Lizard package。
- 每个迁入的 Python 文件都有明确对应的 TypeScript 文件和测试。
- TypeScript port 保持 Lizard 1.23.0 在现有 TypeScript、Go、Rust、Python 扫描范围内的结果。
- adapter 直接调用 TypeScript API，不再使用进程和 CSV 协议。

## Non-Goals

- 不翻译产品未使用的语言 reader、CLI、reporter、extension 和 duplicate detector。
- 不重写为新的 parser，也不顺便修复 Lizard 行为。
- 不提供独立 npm package 或公共 API。

## Decisions

### Decision 1: 以产品所需源码闭包为翻译范围

先根据实际 import 和调用关系确认所需文件，再按一份上游文件对应一份主要 TypeScript 文件的方式迁入：

| Lizard source | TypeScript target |
| --- | --- |
| lizard.py | lizard.ts |
| lizard_languages/code_reader.py | languages/code-reader.ts |
| lizard_languages/clike.py | languages/clike.ts |
| lizard_languages/golike.py | languages/golike.ts |
| lizard_languages/script_language.py | languages/script-language.ts |
| lizard_languages/js_style_regex_expression.py | languages/js-style-regex-expression.ts |
| lizard_languages/typescript.py | languages/typescript.ts |
| lizard_languages/go.py | languages/go.ts |
| lizard_languages/rust.py | languages/rust.ts |
| lizard_languages/python.py | languages/python.ts |
| lizard_languages/__init__.py | languages/index.ts |

如果翻译过程中发现新的必需依赖，先补充 source map 再迁入。每个文件记录上游 revision、license notice 和对应测试。

### Decision 2: 先对照翻译，再进行 TypeScript 化整理

第一阶段尽量保留原有类型职责、状态名称、token 顺序和控制流。Python generator、collection 和 regular expression 只做 TypeScript 所需的等价改写。无法直接对应的地方用注释和测试说明差异。

等价验证完成前不合并文件、不重排状态机，也不改变已知 parser 限制。后续若要重构，继续复用同一套对照测试。

### Decision 3: 直接作为内部 TypeScript 模块调用

port 暴露内部 analyze(source, language) 一类的 typed API，function-metrics adapter 读取已有 scan scope 中的文件后直接调用。port 不负责文件发现、配置、warning、gate 或输出。

adapter 继续负责路径、UTF-8、FunctionMetric 归一化和 diagnostic 映射。TypeScript port 抛出的不可恢复错误按现有 scanner fatal contract 处理。

### Decision 4: 用翻译测试和结果对照证明等价

每翻译一个上游文件，同时迁入对应单元测试。四语言 corpus 同时运行固定 Python/Lizard 1.23.0 和 TypeScript port，对照 function inventory、name、long name、range、NLOC、CCN、token count 和 parameters。

Python/Lizard 只作为迁移期 oracle。required validation 使用提交到仓库的 source 和 expected results，不依赖 Python。存在未解释差异时不切换默认实现。

### Decision 5: 等价后一次性移除 Python runtime

对照通过后，adapter 切换到 TypeScript API，并删除 production Lizard command、args、availability check、process wrapper 和 CSV parser。scanner identity 更新，旧 backend 产生的 cache 或 baseline 按现有不兼容规则重新扫描。

稳定的 FunctionMetric、sourceTool、warning、gate、diagnostic 和 human/JSON output 保持不变。

## Implementation Order

1. 等待前置 change 固定现有行为和四语言 fixtures。
2. 固定上游 revision、source map、license 和对应 tests。
3. 逐文件翻译 core、reader base 和共享 helper。
4. 逐文件翻译四个 language reader。
5. 运行单元测试、四语言 differential 和产品级回归。
6. 切换 adapter，删除 Python/Lizard runtime 路径并更新文档。

## Open Questions

无。实现时只允许通过 source map 增补实际依赖文件，不扩大产品语言范围。
