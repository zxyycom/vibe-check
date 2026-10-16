import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  binaryTimeUnits,
  roundedMilliseconds,
  roundedRatio,
  timeQuantumExponent
} from "./exact-time.ts";
import { oracleUnits, assertRoundedUnits, assertRoundedRatio } from "./exact-time.test-support.ts";

describe("Scheduler exact timing arithmetic", () => {
  it("rounds exact interval sums and local differences at binary64 boundaries", () => {
    const powers = [-1074, -1073, -1022, -1000, -53, -1, 0, 1, 52, 100, 970, 1023];
    for (const sample of [
      0,
      -0,
      Number.MAX_VALUE,
      -Number.MAX_VALUE,
      ...powers.flatMap((exponent) => [2 ** exponent, -(2 ** exponent)])
    ]) {
      assert.equal(binaryTimeUnits(sample), oracleUnits(sample));
      if (sample >= 0)
        assertRoundedUnits(roundedMilliseconds(binaryTimeUnits(sample)), oracleUnits(sample));
    }
    const max = oracleUnits(Number.MAX_VALUE),
      halfOverflowUlp = oracleUnits(2 ** 970);
    for (const exact of [
      0n,
      1n,
      2n,
      (1n << 52n) - 1n,
      1n << 52n,
      (1n << 53n) - 1n,
      (1n << 53n) + 1n,
      (1n << 53n) + 3n,
      (1n << 54n) - 1n,
      oracleUnits(2 ** 900) + 1n,
      max - 1n,
      max,
      max + halfOverflowUlp - 1n,
      max + halfOverflowUlp,
      max * 4n
    ]) {
      assertRoundedUnits(roundedMilliseconds(exact), exact);
    }
    const prefix = max * 4n;
    assert.equal(roundedMilliseconds(prefix + 1n - prefix), Number.MIN_VALUE);
    assert.equal(
      roundedMilliseconds(0n * (oracleUnits(Number.MAX_VALUE) - oracleUnits(-Number.MAX_VALUE))),
      0
    );
    let exact = 0n,
      actual = 0n;
    for (let index = 0; index < 10000; index++) {
      const elapsed = index % 2 === 0 ? 2 ** 400 : Number.MIN_VALUE,
        count = index % 17;
      exact += oracleUnits(elapsed) * BigInt(count);
      actual += binaryTimeUnits(elapsed) * BigInt(count);
    }
    assert.equal(actual, exact);
    assertRoundedUnits(roundedMilliseconds(actual), exact);
    let random = 0x51a7c0de;
    function next() {
      random ^= random << 13;
      random ^= random >>> 17;
      random ^= random << 5;
      return random >>> 0;
    }
    for (let index = 0; index < 2000; index++) {
      const bytes = new DataView(new ArrayBuffer(8));
      bytes.setUint32(0, next());
      bytes.setUint32(4, next());
      const sample = bytes.getFloat64(0);
      if (!Number.isFinite(sample)) continue;
      assert.equal(binaryTimeUnits(sample), oracleUnits(sample));
      const randomExact = oracleUnits(Math.abs(sample)) * BigInt(next() % 29);
      assertRoundedUnits(roundedMilliseconds(randomExact), randomExact);
    }
  });
  it("preserves exact sampled values under an invocation-local quantum", () => {
    const starts = [
      -Number.MAX_VALUE,
      -1,
      -Number.MIN_VALUE,
      -0,
      0,
      Number.MIN_VALUE,
      2 ** -1022,
      1 - 2 ** -53,
      1,
      1 + 2 ** -52,
      2 - 2 ** -52,
      2,
      2 + 2 ** -51,
      2 ** 20 - 2 ** -33,
      2 ** 20,
      2 ** 20 + 2 ** -32,
      Number.MAX_VALUE
    ];
    for (const first of starts) {
      const quantum = timeQuantumExponent(first),
        quantumUnits = oracleUnits(2 ** quantum);
      if (first <= 0 || first < 2 ** -1022) assert.equal(quantum, -1074);
      let previous = first;
      for (const sample of [...starts, 2 ** 50, 2 ** 100, 2 ** 1000, Number.MAX_VALUE]
        .filter((candidate) => candidate >= first)
        .sort((a, b) => a - b)) {
        const scaled = binaryTimeUnits(sample, quantum);
        assert.equal(scaled * quantumUnits, oracleUnits(sample));
        assertRoundedUnits(
          roundedMilliseconds(scaled < 0n ? -scaled : scaled, quantum),
          oracleUnits(Math.abs(sample))
        );
        const elapsed = scaled - binaryTimeUnits(previous, quantum),
          exact = oracleUnits(sample) - oracleUnits(previous);
        assert.equal(elapsed * quantumUnits, exact);
        assertRoundedUnits(roundedMilliseconds(elapsed, quantum), exact);
        previous = sample;
      }
    }
  });
  it("rounds exact utilization quotients through halfway, underflow and unit boundaries", () => {
    const max = oracleUnits(Number.MAX_VALUE);
    for (const [numerator, denominator] of [
      [0n, 1n],
      [1n, 1n],
      [1n, 3n],
      [2n, 3n],
      [1n, 1n << 1075n],
      [3n, 1n << 1076n],
      [1n, (1n << 1075n) - 1n],
      [1n, 1n << 1074n],
      [1n, 1n << 2000n],
      [max, max * 2n]
    ] as const) {
      assertRoundedRatio(roundedRatio(numerator, denominator), numerator, denominator);
    }
  });
});
