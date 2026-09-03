# Lizard 1.23 Readiness Evidence

These files pin the first TypeScript analyzer migration to Lizard tag `1.23.0`, commit `06284ec87c1966fee4ddbf3f068ccf89b987b0f8`.

## Reproduce

This is an **external oracle-regeneration audit**, not a Product build, test, Gate, or consumer prerequisite. It intentionally needs network access only to provision a disposable Python/Lizard environment and the fixed Pygments wheel; normal repository work uses neither Python nor Lizard.

```sh
git clone https://github.com/terryyin/lizard.git /tmp/lizard-1.23-audit.tUCD0B
git -C /tmp/lizard-1.23-audit.tUCD0B checkout 06284ec87c1966fee4ddbf3f068ccf89b987b0f8
git -C /tmp/lizard-1.23-audit.tUCD0B status --porcelain
python3 -m venv /tmp/lizard-1.23-oracle-venv
/tmp/lizard-1.23-oracle-venv/bin/python -m pip install 'lizard==1.23.0'
export LIZARD_SOURCE_ROOT=/tmp/lizard-1.23-audit.tUCD0B
export PATH=/tmp/lizard-1.23-oracle-venv/bin:$PATH
export PYTHONPATH="$LIZARD_SOURCE_ROOT${PYTHONPATH:+:$PYTHONPATH}"
lizard --version

PYGMENTS_WHEEL=/tmp/pygments-2.18.0/pygments-2.18.0-py3-none-any.whl
mkdir -p "$(dirname "$PYGMENTS_WHEEL")"
curl --fail --location --output "$PYGMENTS_WHEEL" \
  https://files.pythonhosted.org/packages/f7/3f/01c8b82017c199075f8f788d0d906b9ffbbc5a47dc9918a945e13d5a2bda/pygments-2.18.0-py3-none-any.whl
echo 'b8e6aca0523f3ab76fee51799c488e38782ac06eafcf95e7ba832985c8e7b13a  /tmp/pygments-2.18.0/pygments-2.18.0-py3-none-any.whl' | sha256sum --check

curated=changes/archive/replace-lizard-with-typescript-function-analyzers/evidence
generated="$curated/lizard-1.23-reader-extension-mapping.json $curated/lizard-1.23-oracle-observations.json $curated/lizard-1.23-malformed-reader-observations.json src/package-checks/function-metrics/analyzer/fixtures/lizard-1.23.0"
sha256sum "$curated/lizard-1.23-provenance-ledger.json" "$curated/lizard-1.23-legal-inventory-input.json" "$curated/source-alignment-deviations.md" "$curated/lizard-1.23-reader-source-identity.json" > /tmp/lizard-curated-evidence.sha256
python3 changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/tools/generate-lizard123-oracle.py
find $generated -type f -print0 | sort -z | xargs -0 sha256sum > /tmp/lizard-oracle-generated.sha256
python3 changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/tools/generate-lizard123-oracle.py
sha256sum --check /tmp/lizard-curated-evidence.sha256
sha256sum --check /tmp/lizard-oracle-generated.sha256
python3 changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/tools/verify-lizard123-provenance.py --pygments-wheel "$PYGMENTS_WHEEL"
git diff --exit-code -- $generated
```

The generator fails unless the `/tmp` source checkout is clean and exactly at the pinned revision. It invokes the separately provisioned `lizard` entry point with that checkout prepended to `PYTHONPATH`, so the fixed source tree—not the installed package copy—forms each independent CSV oracle observation; it never uses a TypeScript implementation to form expected values. It can write **only** the reader/extension mapping, normal/edge and malformed oracle observations, and fixture corpus. The malformed corpus has exactly one reader-state-targeted incomplete input for each source-order reader; all 27 selected inputs have a stable successful upstream result, which may be a complete empty list. The curated provenance, legal-inventory and deviation ledgers are deliberately not generator outputs; the two SHA checks prove they survive two generator runs unchanged, and the generated-output SHA check proves the oracle run is byte-stable before the provenance verifier runs. The verifier additionally reads the fixed Pygments 2.18.0 wheel, not the incidental Pygments version installed with Lizard, then verifies the checked-in package-root notice, exact license texts, provenance copy, translated source headers, and deferred-source absence.

## Materials

- `lizard-1.23-reader-extension-mapping.json`: 27 upstream reader classes and the 55 case-insensitive extension identities used by the current public Check.
- `lizard-1.23-oracle-observations.json`: normal fixture for every extension plus an edge fixture for every reader. The generated run observes 82 fixtures and 82 function measurements.
- `lizard-1.23-malformed-reader-observations.json`: one deterministic malformed/incomplete, reader-state-targeted fixture for each of the 27 source-order readers. It records the exact fixture byte hash and complete CSV function metrics/order/ranges; all selected upstream inputs return successfully, including 18 source-defined empty function lists.
- `lizard-1.23-provenance-ledger.json`: 79 fixed-tag ledger entries, including the exact Pygments 2.18.0 ErlangLexer source range. It partitions all 1,162 `lizard.py` lines and closes the 19 deferred extension bodies plus two deferred support modules; `verify-lizard123-provenance.py` rejects source/distribution SHA, range, status, target/header, legal-input, package-root legal-material and closure drift.
- `lizard-1.23-reader-source-identity.json`: static source-to-target identity evidence for every translated `lizard_languages/**` range: module definitions, classes, fields and callbacks either resolve to the named TypeScript identity or declare a narrow host seam. `source-identity.test.ts` checks it against the fixed provenance ledger and TypeScript AST; it is not a runtime registry, reflection mechanism, or Product API.
- `lizard-1.23-legal-inventory-input.json`: fixed inputs and required output paths/hashes for Lizard MIT, `lizard.py` Apache-2.0, and the Pygments 2.18.0 BSD-2-Clause ErlangLexer source. The verified package inventory is [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md) and `licenses/**`, not this Change input ledger.
- `readiness-boundaries.json`: the readiness-stage evidence state for malformed source, read failure, cancellation, resource capacity and source-byte decoding. The malformed boundary is closed by the 27-reader differential corpus; it does not turn malformed syntax into a public Product guarantee. The file distinguishes source-tree-only observations from separately verified package acceptance and measurements that have no declared performance budget. [`resource-and-cancellation.md`](resource-and-cancellation.md) is the human-readable authority for the Product resource conclusion and links its single spike generator to the checked-in JSON baseline.

Fixtures live under `src/package-checks/function-metrics/analyzer/fixtures/lizard-1.23.0/`. They are checked-in oracle/test inputs consumed by reader and adapter differential tests; the production analyzer does not dynamically discover, read, or ship them as runtime inputs.
