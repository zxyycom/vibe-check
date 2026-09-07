# Proposal

本 Draft 只审查仍未处理的 Check guide 共性与差异边界，避免在已完成的 package documentation 整理后再次登记相同工作。

## Why

`clarify-package-documentation` 及其 follow-up 已完成 README/API/tool guide/内部 owner 调整，并已处理 function waiver `{ identity, reason }` 示例、四 Check 摘要共享说明、function analyzer detail 到 scanner-dependencies、markdown cache 到 project-files，以及 SCC 3.7 旧对照。剩余候选是：system files source 的 glob-array 替换说明、waiver 公共规则与 parser 调用去重的系统审查。

文档压缩若把 `codeAreas` 领域语义或各 Check 默认差异统一，会损害 consumer 对 owner、边界和验收的理解。`docs/development/project-files.md` 继续拥有内部实现事实；新的、随包的 public file tool guide 如获确认，才可成为 files 消费者共同契约的自足落点。这是一种推荐阅读/关系顺序，不是既定硬依赖。

## Outcome

产出可确认的文档与 owner 方案：将真正共同的 files/waiver/parser information 放在恰当共同 owner，各 Check guides 仅保留其独立 obligation，并明确任何 public file tool 的未来关系。未确认或无稳定共同契约的内容保留 local，不以减少篇幅为成功标准。

当前 owner 包含内部 `docs/development/project-files.md`、`docs/development/scanner-dependencies.md`、随包 `docs/guides/finding-waivers.md`、四个 Check guides 与未来可能的随包 public file-tool guide。本 Draft 不修改产品或重做已经完成的文档工作。
