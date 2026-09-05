import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeLizardAutoRead } from "./measurement.ts";

const LIZARD_124_AUTO_READ_OBSERVATIONS = [
  {
    bytes: "efbbbf64656620666f6f28293a0a20202020706173730a",
    expected: "def foo():\n    pass\n",
    name: "a valid initial BOM"
  },
  {
    bytes: "646566efbfbd6e616d6528293a0a20202020706173730a",
    expected: "def\ufffdname():\n    pass\n",
    name: "a valid U+FFFD sequence"
  },
  {
    bytes: "646566ff206e616d6528293a0a20202020706173730a",
    expected: "def name():\n    pass\n",
    name: "an invalid byte"
  },
  {
    bytes: "646566e282206e616d6528293a0a20202020706173730a",
    expected: "def name():\n    pass\n",
    name: "a truncated multibyte sequence"
  },
  {
    bytes: "efbbbf646566ff206e616d6528293a0a20202020706173730a",
    expected: "\ufeffdef name():\n    pass\n",
    name: "a BOM followed by an invalid byte"
  },
  {
    bytes: "646566206e65776c696e657328293a0d0a20202020706173730d",
    expected: "def newlines():\n    pass\n",
    name: "valid CRLF and CR newlines"
  },
  {
    bytes: "646566ff206e65776c696e657328293a0d0a20202020706173730d",
    expected: "def newlines():\r\n    pass\r",
    name: "fallback newlines after an invalid byte"
  },
  {
    bytes: "ff41c280e0a080f0908080",
    expected: "A\u0080\u0800\u{10000}",
    name: "valid two-, three-, and four-byte sequences after an invalid byte"
  },
  {
    bytes: "c080c1bf",
    expected: "",
    name: "overlong two-byte sequences"
  },
  {
    bytes: "eda080",
    expected: "",
    name: "a UTF-8 encoded surrogate"
  },
  {
    bytes: "f0808080f4908080f5808080",
    expected: "",
    name: "out-of-range four-byte sequences"
  },
  {
    bytes: "e28220f0908080",
    expected: " \u{10000}",
    name: "a truncated sequence before a later valid sequence"
  },
  {
    bytes: "c2c280",
    expected: "\u0080",
    name: "an invalid lead byte before a valid trailing sequence"
  }
] as const;

describe("functionMetrics source-byte admission", () => {
  it("matches Lizard 1.24 auto_read byte and newline observations", () => {
    for (const observation of LIZARD_124_AUTO_READ_OBSERVATIONS) {
      assert.equal(
        decodeLizardAutoRead(Buffer.from(observation.bytes, "hex")),
        observation.expected,
        observation.name
      );
    }
  });
});
