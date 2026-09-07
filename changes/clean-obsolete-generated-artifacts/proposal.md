# Proposal

本 Change 保持 Draft，仅记录一次已获明确授权的窄清理及其证据；它不批准目录级保留策略、自动清理或 release 处置。

## Why

用户指出 build、artifacts 等目录可能混有旧版本或过往失败结果。目录名称和年龄都不足以证明可以删除，因此本次仍逐项核对 owner、引用、活跃 writer、恢复方式和当前 candidate 身份。

## Outcome

2026-09-07 已在明确授权下删除两份确认由测试遗留、无人引用且可重新生成的默认 machine-publication 文件：`artifacts/vibe-check/run.json` 和 `artifacts/vibe-check/records.ndjson`。精确来源、保留项、验证与动态再生风险见 [cleanup-evidence.md](cleanup-evidence.md)。

当前 local candidate、安装、receipt/compiler state、formal release staging/receipt、Gate diagnostics 与空的 `artifacts/vibe-check/` 父目录均未动。尚未建立或批准持续清理机制。
