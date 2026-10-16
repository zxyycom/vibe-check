/** Exact integer multiples of this Run's binary quantum; not a public time-resolution change. */
export type BinaryTimeUnits = bigint;

/** All accepted samples remain >= a positive first sample, so their binade cannot shrink. */
export function timeQuantumExponent(firstSample: number): number {
  if (firstSample <= 0) return -1074;
  const encoding = new DataView(new ArrayBuffer(8));
  encoding.setFloat64(0, firstSample);
  const exponent = Number((encoding.getBigUint64(0) >> 52n) & 0x7ffn);
  return exponent === 0 ? -1074 : exponent - 1075;
}

/** The caller has already validated the clock sample as finite. */
export function binaryTimeUnits(milliseconds: number, quantumExponent = -1074): BinaryTimeUnits {
  const encoding = new DataView(new ArrayBuffer(8));
  encoding.setFloat64(0, milliseconds);
  const bits = encoding.getBigUint64(0);
  const exponent = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & ((1n << 52n) - 1n);
  const significand = exponent === 0 ? fraction : (1n << 52n) | fraction;
  const shift = (exponent === 0 ? 0 : exponent - 1) - (quantumExponent + 1074);
  const magnitude = significand << BigInt(shift);
  return bits >> 63n === 0n ? magnitude : -magnitude;
}

/** One round-to-nearest/ties-even conversion, after all exact local arithmetic. */
export function roundedMilliseconds(units: BinaryTimeUnits, quantumExponent = -1074): number {
  if (units < 0n) return Number.NaN;
  const significantBits = units.toString(2).length;
  if (significantBits <= 53) return Number(units) * 2 ** quantumExponent;
  const discardedBits = BigInt(significantBits - 53);
  const significand = units >> discardedBits;
  const discarded = units - (significand << discardedBits);
  const halfway = 1n << (discardedBits - 1n);
  const increment = discarded > halfway || (discarded === halfway && (significand & 1n) !== 0n);
  const rounded = increment ? significand + 1n : significand;
  return Number(rounded) * 2 ** (Number(discardedBits) + quantumExponent);
}

/** Exact integral units cancel: quotient rounding also covers subnormal/underflow results. */
export function roundedRatio(numerator: bigint, denominator: bigint): number {
  if (numerator < 0n || denominator <= 0n) return Number.NaN;
  if (numerator === 0n) return 0;
  const exponent = ratioBinadeExponent(numerator, denominator);
  const quantumExponent = Math.max(-1074, exponent - 52);
  const dividend = quantumExponent < 0 ? numerator << BigInt(-quantumExponent) : numerator;
  const divisor = quantumExponent > 0 ? denominator << BigInt(quantumExponent) : denominator;
  const rounded = roundIntegerQuotient(dividend, divisor);
  return Number(rounded) * 2 ** quantumExponent;
}

export function finiteNonnegative(milliseconds: number): boolean {
  return Number.isFinite(milliseconds) && milliseconds >= 0;
}

/** Exact floor(log2(numerator/denominator)), without floating-point logarithms. */
function ratioBinadeExponent(numerator: bigint, denominator: bigint): number {
  let exponent = numerator.toString(2).length - denominator.toString(2).length;
  let belowPower: boolean;
  if (exponent >= 0) {
    const scaledDenominator = denominator << BigInt(exponent);
    belowPower = numerator < scaledDenominator;
  } else {
    const scaledNumerator = numerator << BigInt(-exponent);
    belowPower = scaledNumerator < denominator;
  }
  if (belowPower) exponent--;
  return exponent;
}
/** Quotient RN/ties-even uses the exact remainder, including a subnormal target quantum. */
function roundIntegerQuotient(dividend: bigint, divisor: bigint): bigint {
  const quotient = dividend / divisor;
  const remainder = dividend % divisor;
  const twiceRemainder = 2n * remainder;
  const increment =
    twiceRemainder > divisor || (twiceRemainder === divisor && (quotient & 1n) !== 0n);
  return increment ? quotient + 1n : quotient;
}
