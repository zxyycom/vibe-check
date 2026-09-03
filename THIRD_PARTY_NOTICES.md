# Third-Party Notices

Vibe Check contains modified TypeScript translations of the analyzer source ranges recorded in
[`licenses/lizard-1.24.0-provenance.json`](licenses/lizard-1.24.0-provenance.json). That inventory is
part of the package: it records the fixed upstream revision, inclusive source ranges, source digests,
target paths, SPDX identifiers, translation/deferment status, and verification boundary for each entry.

## Lizard 1.24.0

- Upstream project: `terryyin/lizard`
- Fixed tag and revision: `1.24.0` / `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`
- The translated language readers, shared reader components, registry, extension protocol, and selected
  `lizardcomplextags` / `lizardnd` extension bodies retain
  the Lizard distribution's MIT terms. The complete fixed-tag text is
  [`licenses/Lizard-1.24.0-MIT.txt`](licenses/Lizard-1.24.0-MIT.txt).
- Translated ranges from `lizard.py` retain that file's Apache-2.0 terms. The complete Apache-2.0 text
  is [`licenses/Lizard-1.24.0-lizard.py-Apache-2.0.txt`](licenses/Lizard-1.24.0-lizard.py-Apache-2.0.txt).
  The original file identifies `terry@odd-e.com` and `www.lizard.ws`; no upstream `NOTICE` file exists
  in the fixed tag.
- Every shipped translated target identifies its source, fixed revision, SPDX expression, and modified
  status in its leading header. The provenance inventory binds that header to the exact source range.

The inventory records exactly 20 remaining Lizard concrete extension bodies (the 19 legacy bodies plus
the `lizardhalstead` entry body) and two extension-only Halstead support modules as
`deferred-extension-body`. They are not shipped as translated source or runtime modules, are not
registered by default, and the recorded paths must not be interpreted as included implementation.

## Pygments 2.18.0 Erlang lexer

`src/package-checks/function-metrics/analyzer/readers/erlang.ts` also contains a modified, reader-local
translation of `pygments/lexers/erlang.py` lines 22–146 from the fixed Pygments 2.18.0 wheel recorded in
the provenance inventory. It retains BSD-2-Clause terms in addition to its Lizard MIT provenance. The
complete wheel license text is
[`licenses/Pygments-2.18.0-BSD-2-Clause.txt`](licenses/Pygments-2.18.0-BSD-2-Clause.txt).

## Other bundled third-party material

The existing exact Momoa license material is retained at
[`third-party-licenses/momoa-3.3.12-LICENSE`](third-party-licenses/momoa-3.3.12-LICENSE).
