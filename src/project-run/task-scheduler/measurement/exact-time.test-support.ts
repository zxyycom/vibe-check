import assert from "node:assert/strict";

/** Independent decode: arithmetic powers/significand, not production binary-layout decoding. */
export function oracleUnits(milliseconds: number): bigint {
  assert.equal(Number.isFinite(milliseconds), true);
  const magnitude = Math.abs(milliseconds);
  if (magnitude === 0) return 0n;
  let exponent = Math.min(1023, Math.floor(Math.log2(magnitude)));
  if (magnitude < 2 ** exponent) exponent--;
  let units: bigint;
  if (exponent < -1022) units = BigInt(magnitude / Number.MIN_VALUE);
  else {
    const significand = BigInt((magnitude / 2 ** exponent) * 2 ** 52);
    units = significand << BigInt(exponent + 1022);
  }
  return milliseconds < 0 ? -units : units;
}

function adjacent(milliseconds: number, direction: "up" | "down"): number {
  if (milliseconds === 0) return direction === "up" ? Number.MIN_VALUE : -Number.MIN_VALUE;
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setFloat64(0, milliseconds);
  const bits = bytes.getBigUint64(0);
  bytes.setBigUint64(0, direction === "up" ? bits + 1n : bits - 1n);
  return bytes.getFloat64(0);
}

function isEven(milliseconds: number): boolean {
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setFloat64(0, milliseconds);
  return (bytes.getBigUint64(0) & 1n) === 0n;
}

const abs = (integer: bigint) => (integer < 0n ? -integer : integer);

/** Independent correctness criterion: nearest representable neighbors, not candidate rounding. */
export function assertRoundedUnits(actual: number, exactUnits: bigint): void {
  assert.ok(exactUnits >= 0n);
  const overflowThreshold = oracleUnits(Number.MAX_VALUE) + oracleUnits(2 ** 970);
  if (actual === Number.POSITIVE_INFINITY) {
    assert.ok(exactUnits >= overflowThreshold);
    return;
  }
  assert.ok(actual >= 0 && Number.isFinite(actual));
  assert.ok(exactUnits < overflowThreshold);
  const distance = abs(oracleUnits(actual) - exactUnits);
  for (const neighbor of [adjacent(actual, "down"), adjacent(actual, "up")]) {
    if (!Number.isFinite(neighbor)) continue;
    const neighborDistance = abs(oracleUnits(neighbor) - exactUnits);
    assert.ok(distance <= neighborDistance, `not nearest: ${actual}`);
    if (distance === neighborDistance) assert.ok(isEven(actual), `odd tie: ${actual}`);
  }
}

export function assertRoundedRatio(actual: number, numerator: bigint, denominator: bigint): void {
  assert.ok(actual >= 0 && Number.isFinite(actual));
  const target = numerator * oracleUnits(1);
  const distance = abs(oracleUnits(actual) * denominator - target);
  for (const neighbor of [adjacent(actual, "down"), adjacent(actual, "up")]) {
    if (!Number.isFinite(neighbor)) continue;
    const neighborDistance = abs(oracleUnits(neighbor) * denominator - target);
    assert.ok(distance <= neighborDistance, `ratio not nearest: ${actual}`);
    if (distance === neighborDistance) assert.ok(isEven(actual));
  }
}
