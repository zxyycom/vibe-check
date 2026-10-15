interface JsonStringSpan {
  readonly closingQuoteOffset: number;
  readonly hasEscape: boolean;
  readonly openingQuoteOffset: number;
}

/** Only call after JSON.parse accepts this exact source; grammar is owned by the native parser. */
export function hasDecodedDuplicateKeys(source: string): boolean {
  // Objects own their key sets; null frames keep array nesting separate from the surrounding object.
  const containerKeys: (Set<string> | null)[] = [];
  for (let offset = 0; offset < source.length; offset += 1) {
    switch (source[offset]) {
      case "{":
        containerKeys.push(new Set<string>());
        break;
      case "[":
        containerKeys.push(null);
        break;
      case "}":
      case "]":
        containerKeys.pop();
        break;
      case '"': {
        const span = readJsonStringSpan(source, offset);
        const isDuplicate = recordPropertyName(source, span, containerKeys.at(-1));
        if (isDuplicate) return true;
        offset = span.closingQuoteOffset;
        break;
      }
    }
  }
  if (containerKeys.length !== 0) throw new Error("Accepted JSON container is not closed.");
  return false;
}

function readJsonStringSpan(source: string, openingQuoteOffset: number): JsonStringSpan {
  let closingQuoteOffset = openingQuoteOffset + 1;
  let hasEscape = false;
  while (closingQuoteOffset < source.length && source[closingQuoteOffset] !== '"') {
    if (source[closingQuoteOffset] === "\\") {
      hasEscape = true;
      closingQuoteOffset += 1;
    }
    closingQuoteOffset += 1;
  }
  if (closingQuoteOffset >= source.length) throw new Error("Accepted JSON string is not closed.");
  return { closingQuoteOffset, hasEscape, openingQuoteOffset };
}

/** Records only property names and returns whether that object's decoded name was already present. */
function recordPropertyName(
  source: string,
  span: JsonStringSpan,
  objectKeys: Set<string> | null | undefined
): boolean {
  let separatorOffset = span.closingQuoteOffset + 1;
  while (isJsonWhitespace(source.charCodeAt(separatorOffset))) separatorOffset += 1;
  if (source[separatorOffset] !== ":") return false;
  if (objectKeys === null || objectKeys === undefined)
    throw new Error("Accepted JSON property has no object container.");
  const propertyName: unknown = span.hasEscape
    ? JSON.parse(source.slice(span.openingQuoteOffset, span.closingQuoteOffset + 1))
    : source.slice(span.openingQuoteOffset + 1, span.closingQuoteOffset);
  if (typeof propertyName !== "string") throw new Error("Accepted JSON property is not a string.");
  if (objectKeys.has(propertyName)) return true;
  objectKeys.add(propertyName);
  return false;
}

function isJsonWhitespace(codeUnit: number): boolean {
  return codeUnit === 0x20 || codeUnit === 0x09 || codeUnit === 0x0a || codeUnit === 0x0d;
}
