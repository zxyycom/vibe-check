# Design

在同一私有严格文档边界中合并 AST 查重与冻结值投影，不改变解析器和公开事实。

## Context

原 reader 先限制 byte length 和 fresh read，再处理 BOM、fatal UTF-8、Momoa strict grammar、decoded duplicates、值转换。
`jsonValidation` 和 schema consumers 使用同一文档边界；当前 public owner 为 JSON Check 的工作原理。
基线 HEAD 为 `0fe55d31ecb11eadf4999b534a0767d08d68bd90`，先前自有 Core fixture 改动保留；dirty source 另以 manifest 标识。

## Goals / Non-Goals

减少有效文档的重复 AST 遍历与 property construction，避免多文档扫描连续占用主事件循环；保持完整输入验收和 private value descriptor。
不替换 Momoa、不使用 JSON.parse 绕过 grammar/duplicate，不增加跨 Run cache、依赖或 limit/timeout 例外。

## Decisions

### Intended Change

在 grammar 完成后一次遍历生成深冻结值并检测重复。对象先置 null prototype，写入前以 own-key membership 判重，
最后 freeze；数组按原顺序转换并 freeze。内部 duplicate symbol 不进入任何公开或跨模块结果。
JSON Check 在文档前顺序 await setImmediate；单份文档读取与解析仍同步，已有取消检查和不可用映射保持。

### Resulting Impacts

原严格边界 tests 增强同目的断言；新增纯投影不引入第二 JSON parser 或 runtime schema。
公开说明补足文件边界让步与单文档不可抢占的范围；结果、schema Consumers 与安全契约保持。
原取消实体以真实排队的 callback 证明 timer/I/O 取消在下一文档前可见，保留独立预期值与 accepted Record prefix。
本项与 Core fixture、Gate cache 和 Scheduler 切面共同进入完整 Gate 验收。

## Risks / Trade-offs

完整 grammar 必须在 duplicate 信号前完成，特殊属性不得影响 ambient prototype，任何 partial value 均不暴露。
性能证据按当前相同 input/source/runtime 比较；旧 profiler 只提供调查线索，不代表新源码计时。

## Open Questions

无阻断公开行为决策。若对照发现理由或安全值变化，修正候选而不是修改预期值掩盖差异。
