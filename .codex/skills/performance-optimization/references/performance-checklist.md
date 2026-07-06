# Performance Checklist

此 reference 保存通用性能工作的细节。先用 `SKILL.md` 确认触发和流程，再按本文件执行测量、triage、修复和验证。命令模板展示 workload shape；实际命令应来自当前仓库脚本、构建产物、agent rules 或相邻测试。

## 目录

- [Baseline](#baseline)
- [Workload Shape](#workload-shape)
- [Bottleneck Triage](#bottleneck-triage)
- [Command Templates](#command-templates)
- [Budget / Evidence Template](#budget--evidence-template)
- [Fix Checklist](#fix-checklist)
- [Decision Cues](#decision-cues)
- [Contract Preservation Cues](#contract-preservation-cues)
- [Verification](#verification)

## Baseline

- [ ] 记录 command/API/UI path、flags/options、payload、output mode、page/limit、query 和 identifier/token。
- [ ] 记录 build/profile：debug、release、production、development；性能数字默认优先 production-like profile。
- [ ] 记录 fixture/data size、record count、nesting depth、重复项、长字段、large payload 和关键 edge case。
- [ ] 多次运行并记录 wall time；可用时记录 median、p95 或保守范围。
- [ ] 当问题涉及资源增长时，记录 CPU、working set、peak memory、bundle size 或 network payload。
- [ ] 当 output、rendering 或 pagination 可能主导成本时，记录 stdout/payload/DOM size 和 page 信息。
- [ ] 保留 before 命令或操作原文，确保 after measurement 可以逐项复现。

## Workload Shape

- [ ] 使用代表真实规模的 fixture/data，不只用短 smoke case。
- [ ] 覆盖大量 entries、多个层级、重复 key/name、长 section 或 large result set。
- [ ] 覆盖 zero result、small result 和 high result count。
- [ ] Pagination 覆盖 first page 和 later pages。
- [ ] Browser workload 覆盖目标 viewport、network condition、critical interaction 和 console state。
- [ ] 超大 fixture 不宜直接入库时，记录生成脚本或复现步骤。

## Bottleneck Triage

先比较相邻层：

```powershell
Measure-Command { <direct-implementation-or-service-command> | Out-Null }
Measure-Command { <wrapper-cli-or-api-command> | Out-Null }
```

| 分类 | 信号 | 优先检查 |
|---|---|---|
| Parser/domain | direct implementation 已慢 | parser pass、tree/list construction、重复 full-input scan |
| CLI/API routing | wrapper 明显慢于 direct implementation | routing、config lookup、default resolution、serialization、error mapping |
| IO/process/network | 首次运行或重复运行被启动、读文件、network 主导 | binary startup、filesystem read、subprocess、HTTP waterfall、stdio size |
| Database/query | endpoint 或 integration 慢 | N+1、missing index、transaction scope、connection pool |
| Output/rendering | JSON/readable/HTML 或 UI render 明显慢 | serialization、pretty formatting、large snippets、DOM size、layout |
| Identifier lookup | lookup/read 随 entry 数增长变慢 | token parsing、index lookup、range lookup、duplicate handling |
| Search | broad query 或 repeated search 慢 | search scope、normalization、allocation churn、result limit |
| Pagination | later pages 昂贵或不稳定 | page slicing、result counting、continuation state、重复 rendering |
| Memory | working set 随输入或重复调用增长 | unbounded buffers、cloned text、cached graph、limit 前收集全部结果 |
| Bundle/load | first load 慢 | bundle split、image/font size、render-blocking resources、cache headers |

## Command Templates

先按仓库规则生成可比较的 optimized/production build：

```powershell
<repository-production-build-command>
```

有 benchmark 工具时优先多轮测量：

```powershell
hyperfine --warmup 3 '<command-under-test> --mode json --limit 8000'
hyperfine --warmup 3 '<api-or-cli-smoke> <large-fixture>'
```

没有 benchmark 工具时使用 PowerShell：

```powershell
Measure-Command {
  <command-under-test> <large-fixture> --output json > $null
}

Measure-Command {
  <command-under-test> search <large-fixture> --query "needle" > $null
}
```

Windows memory sampling：

```powershell
$p = Start-Process <command> -ArgumentList @("<args>") -PassThru -NoNewWindow
while (-not $p.HasExited) {
  Get-Process -Id $p.Id | Select-Object Id,CPU,WorkingSet64,PeakWorkingSet64
  Start-Sleep -Milliseconds 100
}
```

## Budget / Evidence Template

只有已有 budget、baseline、用户报告或 merge policy 需要后续比较时，才把 measurement 沉淀成性能验证证据。普通 measurement 优先记录为 observation。

```text
Workload: <command/API/UI path>
Fixture/Data: <size and shape>
Build/Profile: <release/production/profile>
Host: <agreed benchmark machine or environment>
Budget: p50 <= <target>, p95 <= <target>, variance <= <target>
Memory/Bundle: peak <= <target>
Evidence: <test/benchmark/smoke/monitoring note>
```

Budget 必须写明 workload、data、mode/options、build profile、host 假设和允许噪声；否则不同测量不可比较。

## Fix Checklist

- [ ] 改动只命中已测出的 bottleneck。
- [ ] Output schema、ordering、pagination、continuation、UI state 和 error behavior 保持稳定。
- [ ] 协议允许时，先应用 limit，再做昂贵 formatting/rendering。
- [ ] Result payload 使用可复用 slice、borrowed data、streaming 或 bounded copy；只有测量证明必要时才复制 full input。
- [ ] Cache 有明确 lifecycle、invalidation、memory bound 和 cross-call 行为。
- [ ] 大型 intermediate result list 已被 bound、stream 或避免。

## Decision Cues

| 场景 | 当前做法 |
|---|---|
| Output、rendering 或 pagination 可能主导成本 | 测量 limit、output construction 和 render cost。 |
| Cache 看起来可用 | 先确认 lifecycle、invalidation、memory bound 和 workload 匹配。 |
| Identifier lookup 成本高 | 优化 owning lookup，同时保持 identifier opacity 和兼容性。 |
| 小输入表现正常 | 用真实规模和结构证明 large workload。 |
| Web first load 慢 | 先看 bundle、image/font、TTFB、render-blocking resources 和 Core Web Vitals。 |

## Contract Preservation Cues

- before/after 使用同一 workload、fixture/data、mode/options、build profile 和机器条件。
- Large workload 用真实规模和结构证明。
- Output shape、ordering、identifier、pagination、UI state 和 error mapping 保持稳定。
- Result collection 在协议允许的位置 bound、stream 或 limit。
- Cache 有明确 lifecycle、invalidation、memory bound 和 cross-call 行为。

## Verification

按改动范围选择最窄验证：

```powershell
<unit-or-integration-test-command>
<cli-or-api-smoke-command>
<benchmark-command>
<browser-performance-command>
<repository-workspace-verifier>
```

交付前：

- [ ] before/after 使用同一 fixture/data、workload、mode/options、build profile 和机器条件。
- [ ] improvement 大于 measurement noise。
- [ ] 当 budget、baseline、用户报告或 merge policy 需要后续比较时，最小性能验证证据覆盖 optimized code path。
- [ ] 无法自动化的 performance evidence 已写明精确复现步骤。
