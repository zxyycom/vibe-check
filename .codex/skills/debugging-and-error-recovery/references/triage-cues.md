# Triage Cues

本引用用于根据症状定位 boundary、选择验证证据和识别调试风险。

## Symptom To Boundary

- Valid input 被 format/probe/validation check 拒绝：检查 input detection、manifest/config、registration、unsupported-format errors。
- 错误输入被接受：检查 validation precedence、routing fallback behavior 和 boundary validation。
- stdin/tool invocation 失败但 direct CLI/API 可用：保存 stdin JSON 或 tool args，验证 operation args 和 envelope decoding。
- Parsed entries 缺失或多出：检查 syntax style、nesting、limits、ignored regions、escapes、generated fixture input。
- Read/detail 内容错误：对比 generated identifier、parsed identifier、selected slice、line/range、body exclusion、child-section behavior。
- Pages 被截断或重复：检查 limit accounting、page/cursor math、continuation metadata、Unicode boundaries。
- Schema mismatch：先把失败字段与 owning type 对比，再修改 fixtures。
- 只有 readable framing 变化：先验证 machine output，再按 formatting-only change 处理。
- Wrapper 与 implementation 不同：检查 structured args、result mapping、error mapping、child process invocation。
- Windows-only failure：在复现和验证中保留精确 path form 和 shell quoting。
- Generated fixture changed：确认变化来自 generator、source fixture、schema 还是 implementation。
- UI 显示错误但数据正确：检查 state mapping、render branch、async update、CSS/layout 和 accessibility tree。

## Validation Cues

- 解析或切片：fixture 应小到能一眼看出 boundary。
- Identifier/read：test 同时检查 generated identifier 和 read/detail result，避免只证明其中一半。
- Pagination：覆盖 first page、continuation page 和超出范围 page/cursor。
- Output modes：machine contract test 优先；readable snapshot 只覆盖 display/framing behavior。
- Wrapper：assert args 到 CLI/API args/result mapping，不复制 parser expectation。
- Windows path：使用原始字符串形式作为 test case 名称或 fixture 注释，便于复现。
- UI：assert user-observable state，不把 internal implementation detail 当 contract。

## Debugging Red Flags

这些信号出现时，回到 evidence record：

- 修复前没有一个稳定复现。
- 只改 expected output，缺少 generator/schema/source 的对齐证据。
- 在 wrapper、formatter、caller 或 UI 层掩盖 owning parser/domain/service 缺陷。
- 用 broad retry、fallback identifier、partial JSON 或 silent default 代替 structured error。
- 同时修改 implementation、schema、fixtures、wrapper 和 docs，但没有分边界验证。
- 错误输出中的命令、URL 或路径被直接执行。

## Recovery Moves

1. 写下 observed vs expected。
2. 选择一个相邻层比较，证明问题在哪一侧。
3. 删除与复现无关的输入，同时保留触发失败的 path/identifier/page/output mode/request/UI action。
4. 把修复限制在 owning boundary。
5. 让选定验证先表达失败或缺口，再验证修复。
