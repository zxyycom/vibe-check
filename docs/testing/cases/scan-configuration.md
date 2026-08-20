# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Recursive Project Definition authoring fails closed
Owner: `docs/configuration.md#public-authoring-surface`
Entities:
- `bun|src/product/public-contract/current.test.ts|current public contract > owns four runtime functions, three ordinary built-in values, public type roots, and effect defaults`
- `bun|src/product/definition/project.test.ts|Project Definition > creates a plain value with product-owned authoring defaults`
- `bun|src/product/definition/project.test.ts|Project Definition > normalizes independently executable parents, children, and an omitted record catalog`
- `bun|src/product/definition/project.test.ts|Project Definition > uses exact collections, clears, and marked inheritance while keeping canonical scheduling`
- `bun|src/product/definition/project.test.ts|Project Definition > accepts empty information-only Checks and returns their non-blocking warnings`
- `bun|src/product/definition/project.test.ts|Project Definition > fails closed for malformed nodes, options, and unmarked inheritance objects`
- `bun|src/product/definition/project.test.ts|Project Definition > fingerprints canonical declarative data, including options but not execution functions`
- `bun|src/product/definition/project.test.ts|Project Definition > keeps complete default Checks mutable through native nested spread before Definition validation`
Proves:
- The public authoring surface contains four operations and three ordinary complete default Check values, not a configuration adjustment or operational-dependency API.
- Recursive executable and information-only Checks normalize independently; exact collections clear inherited values only deliberately through `inherit`, and callback functions stay outside declarative fingerprints.
- Malformed node data, incomplete default option branches, invalid scanner values, unknown default code areas, and unmarked inheritance values fail closed. Native object spread creates a mutable candidate before Definition validation without mutating shared defaults; the duplication default keeps its portable marker across copied Definition fingerprints.
