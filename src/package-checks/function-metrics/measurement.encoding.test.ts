import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeLizardAutoRead } from "./measurement.ts";

const LIZARD_123_AUTO_READ_OBSERVATIONS = [
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
  }
] as const;

describe("functionMetrics source-byte admission", () => {
  it("matches Lizard 1.23 auto_read byte and newline observations", () => {
    for (const observation of LIZARD_123_AUTO_READ_OBSERVATIONS) {
      assert.equal(
        decodeLizardAutoRead(Buffer.from(observation.bytes, "hex")),
        observation.expected,
        observation.name
      );
    }
  });
});
