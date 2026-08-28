# Design

本设计以显式 source 建立候选文件事实，再由共享多 selection 过滤和 package-owned Finding policy 形成各 Check 的领域结果。

## Context

实施前由 `docs/scan-scope.md` 定义的 Check-owned file selection，会让 `src/package-checks/project-files/collection.ts` 优先调用 ignore-aware `git ls-files`，并在失败时退回 filesystem。repository quality Definition 的三个 metric Checks 合计为 11 个 area 重复调用该入口。Core Check facts 只认识 arbitrary final data 与 supplemental Records，不拥有 Finding schema。

## Goals / Non-Goals

目标是让候选来源、过滤、枚举复用和 Finding 阻断语义显式、可验证并保持 Check-owned。非目标是建立 Product-wide scan scope、隐式 provider Check、跨 Check hidden cache、通用 Core Finding registry、Git diff/baseline 输入或 legacy compatibility reader。

## Decisions

### Intended Change

- `ProjectFileSelection` 改为完整 `{ source, include, exclude }`；constructor input 的三个字段可省略并分别默认到 `filesystem`、`["**/*"]` 和 package exclusions。
- filesystem source 枚举 root 下普通文件且不跟随 symlink；git-worktree source 使用已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件，并下沉已初始化 submodule。任一来源失败均报告收集失败，不切换来源。
- project-files owner 提供单一来源的候选收集与多个命名选择的过滤。area-based Check 先按 source 分组，再对每种来源枚举一次。
- package code-quality owner 提供共享 Finding policy 类型、解析和汇总；每个领域 Check 仍拥有 threshold、candidate conversion、Record ID/data 与 unavailable vocabulary。
- top-level `findingPolicy` 默认 `blocking`，area 可覆盖；一个 finding 涉及任一 blocking area 即 blocking；所有 findings 都发布，blocking count 非零时 Check failed。

### Resulting Impacts

- Git 成功空集合仍是合法空候选，但 Git command/inspection failure 不再被 filesystem 掩盖；filesystem 不读取 `.gitignore`。
- 命名选择使用调用方提供的稳定 area ID，返回稳定排序、冻结的路径；相同来源的一次枚举结果在 owning Check 内共享。
- duplicate fragment、file path 和 function metric 的 matching areas 使用同一“任一 blocking”合并规则，但各自 limit 计算保持领域所有权。
- `blocking` 不表示 preflight block、scheduler stop 或 Gate exit；它只决定正常 Finding 是否计入 `blockingFindingCount` 和 Check status。
- machine facts 会新增 file/duplicate Record `blocking` 字段和 final `blockingFindingCount`，不新增文件清单事实。

## Risks / Trade-offs

- filesystem 默认可能包含 Git ignored files；package default excludes 与 consumer include/exclude 是唯一选择事实，文档必须显式说明。
- hard cut 后，git-worktree 的 Git 失败会直接使 Check 不可用，可能影响依赖旧 fallback 的调用；测试和变更说明必须让该边界保持可见。
- 批量过滤需要保持当前 glob、特殊路径、submodule 与 exact-input 语义；候选枚举和 selection filtering 分层测试避免行为混淆。
- Finding contract 扩展改变既有 machine data shape；package 仍未提供兼容双写，所有声明和验收材料必须同步。

## Open Questions

无。source 默认、失败语义、provider 非目标与 Finding policy 范围均已由当前讨论确认。
