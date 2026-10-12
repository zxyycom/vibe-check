# 辅助代码规范及 scoped flags 证据独立复核

## 结论

**通过，无遗留实质发现。** 本结论覆盖停止写入后的 candidate helper、根级转换/验证脚本及已形成的两行 flags 补测证据；不把 lint/format 通过、临时用途或归档性质当作免审理由。未实施或修改被审对象。

本次不证明新增提速或所有输入无回退，也不把旧 37-workload baseline 比较冒称新源码重新测量。当前交付文档/归档仍由主线程后续完成，未归档不作为本阶段缺陷。

## 对象与冻结身份

- 仓库 `/workspace/vibe-check`：稳定产品增量为 `e44e06d4749a883964564d7f312dc7c8353fdf0a` → `435eb4dce09b65f1ef50b6139b20d54b8a53a738`，只有 `/workspace/vibe-check/src/project-run/check-execution/flag-controls.ts` 的一行直接调用替换、七行 helper 与空行删除。产品结论已记录在 `/tmp/vibe-low-risk-review.5n66j6/style-doc-review.md`，本次未重新全审产品。
- `/tmp/vibe-low-risk-style.9xQguq/historical/` 是原 archive 比较源；原 `helper-source.tar.gz`、独立审查 `audit-script.tar.gz` 的 regular-file 字节与 historical 实际文件逐一相同。`historical/audit-source-bound.py` 是本轮绑定历史 after 的对照副本，不是原执行源码。
- `/tmp/vibe-low-risk-style.9xQguq/candidate-helper-sha256.txt` SHA：`4145d5eba32bbd448df9d8d4c1b505783c1c48691520df730090f769dcc22299`；其 25 文件均独立核对当前字节。
- `/tmp/vibe-low-risk-style.9xQguq/style-before-src-sha256.txt` SHA：`8fe097928bef32df57b87a7414b7f80853acd968048d8229c5de881216478b40`，等于旧 after-final 清单；style-before 指向旧冻结 after-final，不是优化前 b3c。style-after 清单 SHA：`5a5103d61d15cdbd353a21993fcdf16802c5c8e6d0bc06a8aabd312366c066bf`。双侧各 722 src、路径集合一致，唯一内容差异是 flag-controls；style-after 每文件与当前仓库相同。
- 根级 `/tmp/vibe-low-risk-style.9xQguq/root-review-source-sha256.txt` SHA：`99eaf808070c6239095e6cf6f8adf849b2a444e6e0aa9ccfeec84d4e0ba0125f`。8 文件逐项 SHA check 通过，包含四个转换/表达式验证 TS、verify-style-results.py、配置与 lifecycle note。早期读取时根级 refactor 脚本仍在格式整理，未以该时点作最终判断；主线程明确停止写入后重新读取稳定版本。

## 编码规范、职责与语义

依据本次同一 review 已完整读取的 `/workspace/vibe-check/docs/development/coding-style.md` 329 行，重点不是数值限额，而是 §2/3/4/5/6/7/10/11 的归属、边界、领域结果、主要数据流及验证责任。

1. **workload construction 的整改有真实职责。** 原 `/tmp/vibe-low-risk-style.9xQguq/historical/harness/workloads-template.txt:66–71` 的 add 实际拥有 push，不能称无责任纯转发 wrapper。其六个位置参数与单一 factory 中混合的 identifier/reason/flags/dependency/artifact/graph/history/learned fixture 流程是本次表达障碍。候选 `/tmp/vibe-low-risk-style.9xQguq/candidate/harness/workloads-template.txt:109–143` 用 SizedFixture、明确顺序和具名 builder 组装同一 matrix；:145–249 的 identifier/reason/normalized flag/dependency、:264–421 的 artifact/graph/critical/history、:424–582 的 learned 与其它 owner 各自创建 fixture 和对应 descriptor，拥有可命名结果，不是按行数任意切分。graph builder 明确产出同一 graph 供后续消费，normalized flag fixture 由 flag/artifact 共享；未引入通用框架、策略或长期 owner。
2. **调用与计时语义保持。** 18 个 descriptor 源表达式的 name/size/iterations/boundary/invoke/asynchronous 与历史 AST 对照相同；全 37 行实际顺序及 metadata/full output 另由独立原始数据比较证明。拆出的创建、graph/prediction/session/context 构造与首次 prepare 仍在 createWorkloads 内、计时外；invoke 未把索引构建移出原 build 行。R04 仍四次 prepare，history recording/prediction 行的 in-memory 边界未改；public prepare invoke 在候选:478–480 仍含 async missing-history read 及三次 decide，原 boundary 文字按已有 E1 解读，不当 isolated prepare。
3. **生成文件与 C05。** 独立核对 workload template 展开为 before/after/style-before/style-after、C05 template 展开为两文件，除显式 source root 外字节相同。C05 本次仅格式整理，原迭代、四次 owner 调用、预构造 fixture 与候选 Set 每 eligible call 成本未改变；不把 C05 当采用项。原 measure/summarize/contracts 等未改内容与历史 archive 匹配。
4. **Python audit 有具名证明责任及正确 source 绑定。** `/tmp/vibe-low-risk-style.9xQguq/candidate/audit-evidence.py:17–30` 的 frozen AuditPaths 区分 real repository、旧 after-final source、original evidence/raw；:42–79 分离 source/archived-byte/helper parity；:82–164 分离 run/order、row observation、统计责任；main:167–175 顺序显式。原检查未弱化，旧 44/10 归档 SHA、raw-text 原字节、722 双侧 source、37 行 2,590 samples 和全部统计仍核对。after 指向历史 frozen source，避免拿当前删除 wrapper 的源码硬配旧 manifest。独立实际执行该候选得到与历史 source-bound 对照逐字相同的 44 行 stdout。
5. **新 style entry 的选择与边界明确。** `/tmp/vibe-low-risk-style.9xQguq/candidate/harness/measure-style.ts:20–42` 拒绝非法 before/after、measurementMode 和 workloadScope；smoke|formal/all|flags 显式，flags 仅两行并检查数量。:44–77 timer/warmup/batch/async branch/last-output assignment/serialization parity 与原 measure 同义；fixture/IO/summary 输出不移入 timer。`run-style-flags.sh:5–22` 固定已有 Bun/Node、拒绝既存 namespace、五对交错、十个独立进程并保留 stdout/stderr/window/order，再用原 summarize，不覆盖旧结果。
6. **根级临时代码同样覆盖。** 稳定 `/tmp/vibe-low-risk-style.9xQguq/refactor-workload-fixtures.ts`、`sync-workload-templates.ts`、`bind-style-replay.ts`、`verify-workload-expressions.ts` 和 `verify-style-results.py` 全文读取。转换只写指定 candidate 副本，输入是冻结历史/template；AST 描述/模板同步/显式 binding 与未知 JSON 到可比较 metadata 各有清楚结果。verify-workload-expressions:71–83 现在先以 unknown 接收 JSON、判 record/rows/row，再复制 metadata；没有 any 绕过。bind:14–43 已同步合法 mode/usage/scope 与生命周期注释，不再生成旧的 permissive CLI。verify-style-results:16–95 拒绝数量/metadata/样本/order/stat 不符，并保留原 samples。root tsconfig include 四个 root TS，继承 candidate strict 配置，exclude 为空；读到 root-tsgo/root-lint/root-format/root-equivalence 的补验材料，与此前仅 13 个 harness TS 的覆盖缺口明确区分。机械检查是实施方证据，不替代上述独立语义判断。
7. **归宿与契约。** `/tmp/vibe-low-risk-style.9xQguq/artifact-note.md` 与代码注释明确这是当前 Change 的一次性转换、replay、审计辅助物；旧档案和工作树不改，无新依赖/安装/长期 benchmark framework。不产生 package API、用户页面、schema 或稳定内部 owner 变更义务；复现需要当前文档解释显式路径和历史/当前 source identity。

## 独立原始数据复算与性能边界

实际读取 `/tmp/vibe-low-risk-style.9xQguq/candidate/style-flags-results/` 全部十份 formal JSON 及 summary/order/window/stdout/stderr：2026-10-12T08:27:57Z–08:27:59Z，顺序 B A / A B / B A / A B / B A，十个不同 PID，stderr 全空。两行保持 300/8 iterations、3×iterations warmup、每进程七批，共 140 samples，无剔除；完整 output 另与期望 canonical id-00000…序列核对。

| 行 | pooled B→A ms | pooled A/B | 五对 after/before process-median ratios | paired median | 更慢对数 |
| --- | --- | --- | --- | --- | --- |
| flags/8 | 0.005900157→0.005486053 | 0.929814858 | 0.629828223 / 0.839547788 / 1.093378699 / 1.027928539 / 1.010602877 | 1.010602877 | 3/5 |
| flags/512 | 0.343614250→0.335661875 | 0.976856679 | 1.125523759 / 0.912233517 / 0.823460307 / 1.098604155 / 0.968505576 | 0.968505576 | 2/5 |

独立重算两侧 pooled median、unscaled MAD、min/max/count、各 process median、每对 ratio 与 pooled ratio，逐值吻合。flags/8 after MAD 0.000463763、min/max 0.004830067/0.017233763；flags/512 after MAD 0.039465625、min/max 0.286952875/0.945519500。after 最大批次均高于 before，且每行都有配对更慢；不能由较低 pooled median 声称新提速或“无回退”。该补测为单独 host/window 的局部 wrapper-removal 成本观察，不是等效性穷举、Run E2E、跨主机实验、生产预算或小/大输入普遍保证。未重新采集原始 37-workload 基线；旧性能证据只保留其原 frozen identity。

## 实际执行、证明力与未覆盖

- 只读读取/diff/hash/archive/source metadata 与分布；未运行转换脚本、测量 entry 或 benchmark。
- 独立脚本 `/tmp/vibe-low-risk-review.5n66j6/audit-style-helper.py` 通过 `uv run --no-project --no-sync --offline python ...` 执行，结果 `/tmp/vibe-low-risk-review.5n66j6/audit-style-helper.log`。uv 提示 no-project 下 no-sync 无效，不影响实际无依赖、离线运行。脚本证明冻结 25 helper、各 722 source、唯一文件差异、原 archive 字节、六个模板展开；独立比较三个 37-row smoke 的 metadata/full output、原 summary JSON/stdout、44 行审计 stdout；复算新 140 samples 及全部统计。
- `uv run --no-project --offline python /tmp/vibe-low-risk-style.9xQguq/candidate/audit-evidence.py` 实际通过，stdout 与原对照 byte-identical；日志 `/tmp/vibe-low-risk-review.5n66j6/candidate-audit-independent.log`。
- `mise exec -- bun run /tmp/vibe-low-risk-style.9xQguq/verify-workload-expressions.ts` 实际通过，18 descriptor AST 与 37 smoke metadata/原 template 对照；日志 `/tmp/vibe-low-risk-review.5n66j6/descriptor-audit-independent.log`。该验证只读、无计时，其 AST 对照不是 fixture 构造的穷举证明；以全文 fixture 顺序/数据流审查和实际 smoke 共同覆盖。
- `sha256sum --check root-review-source-sha256.txt` 八项通过；candidate-helper 清单 25 项另通过，日志 `/tmp/vibe-low-risk-review.5n66j6/helper-freeze-independent.log`。`uv run --no-project --offline python /tmp/vibe-low-risk-style.9xQguq/verify-style-results.py` 实际通过，日志 `/tmp/vibe-low-risk-review.5n66j6/root-style-results-independent.log`；其结果另由上述自有脚本独立复算，不只转述同一 verifier。
- 本次不重跑 strict/type-aware lint/format、Gate、产品测试、Node consumer、Case、C05 equivalence 或原 37 smoke。这些机械自验由实施/主线程提供；读到的 root-tsgo/root-lint 文件是 PASS 摘要，不把它们说成本 reviewer 的执行。候选原日志/smoke 是形成时证据，完整 output/metadata 已独立比较。未证明异常输入穷举、portable replay、host 无其它负载、运行时 binary 在每个进程的环境观测或最终新 archive 的全部 SHA；静态 pinned script、冻结材料与局部分布支撑限定结论。
- 新 helper 不是旧测量的形成时 helper，当前 source 也不是旧 after-final 原字节；归档必须另组，不改旧 44/10/16 身份或用旧 Gate 冒充当前执行。本次未核对尚在整理的最终 acceptance/reading-guide/任务状态、新 archive 或最终 Git 交付，待稳定后按主线程要求定向复核。

reviewer 本次只新增自有临时审计脚本、日志及此报告；不写被审仓库/candidate/historical、旧报告或证据，未联网/安装/spawn/Git 写入。其用途为独立复核与可复查交接，主线程决定是否单列归档，后续清理按精确路径和当前授权；不自行勾选任务或宣称集成/发布/Change 结项完成。
