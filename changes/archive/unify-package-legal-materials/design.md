# Design

本设计用一个随包材料目录和一个安装时依赖审计分别承接两个不同事实源。

## Context

当前 `licenses/**` 是 Lizard/Pygments translated-source legal material 与 provenance owner；`scripts/package/artifact/third-party-licenses/**` 另存 Immutable、Momoa 和 Secretlint 文本，build 将两者复制为两个 package 目录。发布 manifest 有十七个直接 dependencies；本次 Linux 隔离安装可观察到一百一十四个 dependency package directories。`jscpd` 使用 semver range，传递图和各平台实际选中的 optional package 可能随安装变化。npm 普通 package tarball 排除 `node_modules`，只有显式 bundled dependencies 才把依赖装入同一 tarball；本项目未声明 bundle dependencies。

## Goals / Non-Goals

目标是消除虚假的目录责任差异、核对每次实际安装图的许可声明，并让消费者和维护者能区分随包内容与独立 dependency packages。非目标是提供法律意见、把动态传递依赖文本复制进 Vibe Check tarball、锁死 consumer 的解析图，或建立公共 runtime API。

## Decisions

### Intended Change

保留 package-root `LICENSE` 作为 Vibe Check own text，保留 `THIRD_PARTY_NOTICES.md` 作为人读索引；因 translated/embedded source 由 Vibe Check 主动携带的第三方文本和 provenance 全部位于 `licenses/**`。删除普通 npm dependencies 的三个选择性镜像副本。Candidate 安装后遍历其 private consumer `node_modules` 中所有实际 package directories，除自身外读取当前或 legacy license declaration，并只接受项目明确列举的现有宽松 license identities。审计结果只作为 exact installation acceptance，不发布为稳定文件清单或 Product API。

### Resulting Impacts

三个选择性 dependency text、原 `third-party-licenses` manifest entry 和对应常量消失。安装图 audit 必须包含 top-level、scoped 与 nested packages，以及本平台实际选中的 optional package；它拒绝 symlink layout、candidate package path 逃逸、缺失/错误 manifest、空 license 和当前 policy 未接受的 license。Legacy `licenses[]` 只在所有条目具有同一个非空且无首尾空白的 `type` 时归一化。Notice 说明 `licenses/` 是 translated/embedded material inventory 而非完整依赖清单，ordinary dependency 的实际版本、传递项和自带 legal material 由独立安装包拥有。Release receipt 继续收录所有 Vibe Check 主动携带材料的 byte identity，不收录动态安装图。

## Risks / Trade-offs

统一路径会改变 prestable package material path；项目已明确 `0.0.x` 不承诺 patch compatibility，但仍需 tar、installed 和文档验收。基于安装目录的 audit 是许可声明/政策证据，不等于律师审查或每个 dependency 义务的物理全文证明。严格 allowlist 会使未来新 license expression 的依赖升级 fail closed，需要维护者显式复核后更新 owner。

## Open Questions

无。
