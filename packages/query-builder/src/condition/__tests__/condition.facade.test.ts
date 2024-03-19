import { getAttributeNamePlaceholder, getValuePlaceholderFromAttributeName } from "../condition.facade";

type GetAttributeNamePlaceholderResult = ReturnType<typeof getAttributeNamePlaceholder>;

describe("getAttributeNamePlaceholder()", () => {
  it("should return a placeholder for a top level attribute path", () => {
    expect(
      getAttributeNamePlaceholder("attribute", ""),
    ).toStrictEqual<GetAttributeNamePlaceholderResult>({
      attributeNamePlaceholder: "#attribute",
      attributeNamePlaceholderValues: {
        "#attribute": "attribute",
      },
    });
  });

  it("should return a placeholder for a top level attribute path with suffix", () => {
    expect(
      getAttributeNamePlaceholder("attribute", "x_suffix"),
    ).toStrictEqual<GetAttributeNamePlaceholderResult>({
      attributeNamePlaceholder: "#attribute_x_suffix",
      attributeNamePlaceholderValues: {
        "#attribute_x_suffix": "attribute",
      },
    });
  });

  it("should return a placeholder for a nested attribute path", () => {
    expect(
      getAttributeNamePlaceholder("attribute.nested.super_nested"),
    ).toStrictEqual<GetAttributeNamePlaceholderResult>({
      attributeNamePlaceholder: "#attribute.#nested.#super_nested",
      attributeNamePlaceholderValues: {
        "#attribute": "attribute",
        "#nested": "nested",
        "#super_nested": "super_nested",
      },
    });
  });

  it("should return a placeholder for a nested attribute path with a suffix", () => {
    expect(
      getAttributeNamePlaceholder("attribute.nested.super_nested", "x_suffix"),
    ).toStrictEqual<GetAttributeNamePlaceholderResult>({
      attributeNamePlaceholder: "#attribute_x_suffix.#nested_x_suffix.#super_nested_x_suffix",
      attributeNamePlaceholderValues: {
        "#attribute_x_suffix": "attribute",
        "#nested_x_suffix": "nested",
        "#super_nested_x_suffix": "super_nested",
      },
    });
  });

  it("should return a placeholder for a nested attribute with an index", () => {
    expect(
      getAttributeNamePlaceholder("attribute.[0]"),
    ).toStrictEqual({
      attributeNamePlaceholder: "#attribute.#0",
      attributeNamePlaceholderValues: {
        "#attribute": "attribute",
        "#0": "[0]",
      },
    });
  });

  it("should return a placeholder for a nested attribute with multiple indexes", () => {
    expect(
      getAttributeNamePlaceholder("attribute.[0].nested.[1].[2]"),
    ).toStrictEqual({
      attributeNamePlaceholder: "#attribute.#0.#nested.#1.#2",
      attributeNamePlaceholderValues: {
        "#attribute": "attribute",
        "#0": "[0]",
        "#nested": "nested",
        "#1": "[1]",
        "#2": "[2]",
      },
    });
  });
});

describe("getValuePlaceholderFromAttributeName()", () => {
  it("should return a placeholder for a top level attribute path", () => {
    expect(
      getValuePlaceholderFromAttributeName("attribute"),
    ).toBe(":attribute");
  });

  it("should return a placeholder for a top level attribute path with suffix", () => {
    expect(
      getValuePlaceholderFromAttributeName("attribute", "x_suffix"),
    ).toBe(":attribute_x_suffix");
  });

  it("should return a placeholder for a nested attribute path", () => {
    expect(
      getValuePlaceholderFromAttributeName("attribute.nested.super_nested"),
    ).toBe(":attribute_nested_super_nested");
  });

  it("should return a placeholder for a nested attribute path with a suffix", () => {
    expect(
      getValuePlaceholderFromAttributeName("attribute.nested.super_nested", "x_suffix"),
    ).toBe(":attribute_nested_super_nested_x_suffix");
  });

  it("should return a placeholder for a nested attribute with an index", () => {
    expect(
      getValuePlaceholderFromAttributeName("attribute.[0]"),
    ).toBe(":attribute_0");
  });

  it("should return a placeholder for a nested attribute with multiple indexes", () => {
    expect(
      getValuePlaceholderFromAttributeName("attribute.[0].nested.[1].[2]"),
    ).toBe(":attribute_0_nested_1_2");
  });
});
