# Implementation Tasks

## 1. Complete Config Parser

- [x] 1.1 增加 config file missing、read failure、invalid JSON、non-object 与 incomplete /
  invalid `QualityConfig` tests。
- [x] 1.2 实现完整 JSON `QualityConfig` parser，覆盖全部现有顶层与 nested fields，并拒绝
  missing、unknown 或 invalid values。
- [x] 1.3 让 parser 返回新的 typed value，不修改 parsed input，也不从
  `DEFAULT_CONFIG` 补字段。
- [x] 1.4 统一抛出包含 resolved config path 的 config parse error，保留原始 cause。

## 2. CLI Selection and Replacement

- [x] 2.1 为 product parser 增加单值 `--config <file>` 与 option-presence tests，覆盖
  relative、absolute、`..`、duplicate、missing-value 和 omitted behavior。
- [x] 2.2 基于 normalized project root 解析 config path，并在调用 `runQualityScan` 前读取
  完整配置。
- [x] 2.3 指定配置时整体替换 `DEFAULT_CONFIG`，证明没有 built-in 或 `VIBE_CHECK_*`
  field merge。
- [x] 2.4 未显式传入 `--top-n` / `--artifact-dir` 时使用 selected config 值；显式 CLI
  value 覆盖对应字段。
- [x] 2.5 把同一 selected config 传给 current、baseline 与 fallback collection。
- [x] 2.6 增加 config failure 顶层 tests，证明 stderr、exit `3`、scanner 未启动且
  artifacts 未创建。
- [x] 2.7 增加 omitted-config 正式入口与 dogfood parity regression。

## 3. Checked-in External Project Fixture

- [x] 3.1 建立 `fixtures/projects/configured-typescript/`，加入完整 JSON config、eligible
  source、excluded / generated controls 和 fixture README。
- [x] 3.2 让 fixture config 使用区别于 `DEFAULT_CONFIG` 的 version、scope、code area、
  thresholds、report、artifact/cache 和 controlled tool settings。
- [x] 3.3 通过正式 Product CLI 从 fixture root 外传入 project root 与相对
  `--config`，断言 selected / excluded files、code area、config version、warning 和
  artifacts。
- [x] 3.4 保持 fixture scanner support deterministic，不依赖网络或未固定第三方 output。

## 4. Owner Docs and Examples

- [x] 4.1 新增简明 configuration owner 文档，列出完整 `QualityConfig` JSON fields、
  path base、replacement、CLI precedence、trusted tools 和 error behavior。
- [x] 4.2 更新 `docs/navigation.md`、CLI、Scan Scope 与 Testing owner docs，删除
  “CLI 不提供 `--config`”的旧约束。
- [x] 4.3 将 fixture config 作为 canonical example，并同步 help、case ledger 与 proof
  targets。

## 5. Delivery Verification

- [x] 5.1 运行 config parser、CLI routing、replacement、fixture acceptance 和 scan-scope
  focused tests。
- [x] 5.2 运行 `bun run test:product`、`bun run typecheck:product` 与
  `bun run lint:product`。
- [x] 5.3 搜索 `DEFAULT_CONFIG`、`VIBE_CHECK_*` 与 selected config flow，确认 explicit
  config 没有 merge 或 fallback。
- [x] 5.4 运行 `bun run validate` 与
  `bun run verify:vibe-check-workspace:required`。
- [x] 5.5 运行 OpenSpec strict validation并汇总 config parse、exit、fixture 与
  omitted-config compatibility evidence。
