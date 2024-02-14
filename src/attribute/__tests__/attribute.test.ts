import {
  binary,
  bool,
  date,
  isBinaryAttribute,
  isBooleanAttribute,
  isDateAttribute,
  isListAttribute,
  isMapAttribute,
  isNumberAttribute,
  isStringAttribute,
  list,
  map,
  number,
  string,
} from "../attribute";

describe("Usage of attribute matches", () => {
  it("should match attribute type", () => {
    const matcherToAttributeSpec = [
      [isStringAttribute, string()],
      [isNumberAttribute, number()],
      [isBinaryAttribute, binary()],
      [isBooleanAttribute, bool()],
      [isDateAttribute, date()],
      [isMapAttribute, map(null as any)],
      [isListAttribute, list(null as any)],
    ];

    for (const [matcher, attribute] of matcherToAttributeSpec) {
      expect((matcher as Function)(attribute)).toBe(true);
    }

    expect.assertions(matcherToAttributeSpec.length);
  });
});
