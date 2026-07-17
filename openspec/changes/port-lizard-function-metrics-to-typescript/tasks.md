本 tasks 按“逐文件翻译、逐文件验证、切换实现、删除 Python runtime”的顺序实施 Lizard TypeScript port。

## 1. 固定翻译基线

- [ ] 1.1 确认 `promote-typescript-quality-tooling-to-product` 已完成源码上移和正式入口接线，Python/Lizard adapter 及现有测试已由产品源码拥有。
- [ ] 1.2 固定 Lizard 1.23.0、commit 06284ec87c1966fee4ddbf3f068ccf89b987b0f8，并记录 source archive 与适用 license。
- [ ] 1.3 核对 design 中的逐文件 source map；发现必需依赖时先更新 map。
- [ ] 1.4 为每个 source file 记录对应 upstream tests、known skips 和目标 TypeScript test。
- [ ] 1.5 用现有 Python/Lizard adapter 保存四语言对照结果。

## 2. 逐文件翻译 Core

- [ ] 2.1 将 lizard.py 中产品需要的 model、builder 和 analysis pipeline 翻译为 lizard.ts。
- [ ] 2.2 将 code_reader.py 翻译为 languages/code-reader.ts，并迁入对应 tokenizer/state-machine tests。
- [ ] 2.3 依次翻译 clike.py、golike.py、script_language.py 和 js_style_regex_expression.py。
- [ ] 2.4 为 Python generator、collection 和 RegExp adaptation 增加最小等价测试。
- [ ] 2.5 确认每个 core 文件都能追溯到上游 revision、license 和 translated tests。
- [ ] 2.6 运行 core unit tests、typecheck 和 lint，修复所有未解释差异。

## 3. 逐文件翻译 Language Readers

- [ ] 3.1 翻译 typescript.py 及对应 tests。
- [ ] 3.2 翻译 go.py 及对应 tests。
- [ ] 3.3 翻译 rust.py 及对应 tests。
- [ ] 3.4 翻译 python.py 及对应 tests。
- [ ] 3.5 翻译 languages/__init__.py 为 typed reader registry。
- [ ] 3.6 在四语言 corpus 上逐字段比较 Python/Lizard 与 TypeScript port，清除所有未解释差异。

## 4. 合并到 TypeScript 扫描路径

- [ ] 4.1 定义内部 typed analyze API，并让现有 function-metrics adapter 直接调用。
- [ ] 4.2 保持现有 scan scope、FunctionMetric normalization、ordering 和 diagnostic mapping。
- [ ] 4.3 运行现有 structural fixtures、warning、gate、human 和 JSON 回归测试。
- [ ] 4.4 更新 scanner identity，并按现有规则处理旧 cache 和 baseline。
- [ ] 4.5 在默认扫描和 required validation 中证明不解析或启动 Python/Lizard。
- [ ] 4.6 删除 Lizard command/args、availability check、process wrapper、CSV parser 和对应 protocol tests。
- [ ] 4.7 更新 scanner dependency、structural scanning 和测试文档。

## 5. 最终验证

- [ ] 5.1 运行受影响 TypeScript tests、typecheck 和 lint。
- [ ] 5.2 运行四语言真实扫描，确认指标、warning、gate 和 output contract 不变。
- [ ] 5.3 搜索 production imports、config 和 process calls，确认没有 Python/Lizard runtime 路径。
- [ ] 5.4 运行 bun run validate 与 bun run verify:vibe-check-workspace:required。
- [ ] 5.5 运行 OpenSpec strict validation，并汇总 source map、对照结果和验证证据。
