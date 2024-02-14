import { Attribute, binary, bool, date, list, map, number, string } from "../../attribute/attribute";
import {
  TypeDescriptorFactory,
  getDescriptorFactoryForValue,
  getDescriptorFactoryForValueByPath,
  transformValueToTypeDescriptor,
} from "../schema-to-type-descriptors.utils";
import { TupleKeyValue, TupleMap } from "../schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema.builder";
import { schema } from "../schema.facade";

describe("Creation of descriptors for by values", () => {
  it("should create a descriptor for simple attributes", () => {
    const descriptorKeysToAttributesSpec = [
      ["S", string(), "test_value"],
      ["N", number(), 999],
      ["B", binary(), new ArrayBuffer(8)],
      ["BOOL", bool(), false],
      ["S", date(), new Date()],
    ];

    for (const [descriptorKey, attribute, testValue] of descriptorKeysToAttributesSpec) {
      //   console.log({ descriptorKey, attribute, testValue });
      const factory = getDescriptorFactoryForValue(attribute) as TypeDescriptorFactory<any>;

      expect(factory).not.toBeNull();
      expect(factory).toBeInstanceOf(Function);
      expect(factory(testValue)).toStrictEqual({
        [descriptorKey as string]: testValue instanceof Date ? testValue.toISOString() : testValue,
      });
    }
  });

  it("should create a descriptor for complex attributes", () => {
    const descriptorKeysToAttributesSpec = [
      ["M", new TupleMap("MAP", [["field", string()]]), new TupleMap("MAP", [["field", string()]])],
      ["L", new TupleMap("LIST", [["field", number()]]), new TupleMap("LIST", [["field", number()]])],
    ];

    for (const [descriptorKey, attribute, testValue] of descriptorKeysToAttributesSpec) {
      //   console.log({ descriptorKey, attribute, testValue });
      const factory = getDescriptorFactoryForValue(attribute) as TypeDescriptorFactory<any>;

      expect(factory).not.toBeNull();
      expect(factory).toBeInstanceOf(Function);
      expect(factory(testValue)).toStrictEqual({ [descriptorKey as string]: testValue });
    }
  });
});

describe("creation of descriptors by paths", () => {
  it("should create a descriptor for simple attributes", () => {
    const testSchema = schema()
      .add("field", string())
      .add("number_field", number())
      .add("bool", bool())
      .add("binary", binary())
      .add("date", date())
      .build();

    const descriptorKeysToPathsSpec = [
      ["S", "field", "test_value"],
      ["N", "number_field", 999],
      ["BOOL", "bool", false],
      ["B", "binary", new ArrayBuffer(8)],
      ["S", "date", new Date()],
    ];

    for (const [descriptorKey, path, testValue] of descriptorKeysToPathsSpec) {
      //   console.log({ descriptorKey, path, testValue });
      const factory = getDescriptorFactoryForValueByPath(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema)),
        path as string,
      ) as TypeDescriptorFactory<any>;

      expect(factory).not.toBeNull();
      expect(factory).toBeInstanceOf(Function);
      expect(factory(testValue)).toStrictEqual({
        [descriptorKey as string]: testValue instanceof Date ? testValue.toISOString() : testValue,
      });
    }
  });

  it("should create a descriptor for complex attributes", () => {
    const testSchema = schema()
      .add("map", map(schema().add("field", string()).build()))
      .add("list", list(map(schema().add("field", number()).build())))
      .build();

    const descriptorKeysToPathsSpec = [
      ["M", "map", new TupleMap("MAP", [["field", string()]])],
      ["L", "list", new TupleMap("LIST", [["field", number()]])],
    ];

    for (const [descriptorKey, path, testValue] of descriptorKeysToPathsSpec) {
      //   console.log({ descriptorKey, path, testValue });
      const factory = getDescriptorFactoryForValueByPath(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema)),
        path as string,
      ) as TypeDescriptorFactory<any>;

      expect(factory).not.toBeNull();
      expect(factory).toBeInstanceOf(Function);
      expect(factory(testValue)).toStrictEqual({
        [descriptorKey as string]: testValue,
      });
    }
  });

  it("should create descriptors for nested attributes inside a map", () => {
    const testSchema = schema()
      .add(
        "map",
        map(
          schema()
            .add("field", string())
            .add("number_field", number())
            .add("binary", binary())
            .add("bool", bool())
            .add("date", date())
            .build(),
        ),
      )
      .build();

    const descriptorKeysToPathsSpec = [
      ["S", "map.field", "test_value"],
      ["N", "map.number_field", 999],
      ["B", "map.binary", new ArrayBuffer(8)],
      ["BOOL", "map.bool", false],
      ["S", "map.date", new Date()],
    ];

    for (const [descriptorKey, path, testValue] of descriptorKeysToPathsSpec) {
      //   console.log({ descriptorKey, path, testValue });
      const factory = getDescriptorFactoryForValueByPath(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema)),
        path as string,
      ) as TypeDescriptorFactory<any>;

      expect(factory).not.toBeNull();
      expect(factory).toBeInstanceOf(Function);
      expect(factory(testValue)).toStrictEqual({
        [descriptorKey as string]: testValue instanceof Date ? testValue.toISOString() : testValue,
      });
    }
  });

  it("should create descriptors for nested attributes inside a list", () => {
    const testSchema = schema()
      .add(
        "list",
        list(
          map(
            schema()
              .add("field", string())
              .add("number_field", number())
              .add("binary", binary())
              .add("bool", bool())
              .add("date", date())
              .build(),
          ),
        ),
      )
      .build();

    const descriptorKeysToPathsSpec = [
      ["S", "list.0.field", "test_value"],
      ["N", "list.0.number_field", 999],
      ["B", "list.0.binary", new ArrayBuffer(8)],
      ["BOOL", "list.0.bool", false],
      ["S", "list.0.date", new Date()],
    ];

    for (const [descriptorKey, path, testValue] of descriptorKeysToPathsSpec) {
      //   console.log({ descriptorKey, path, testValue });
      const factory = getDescriptorFactoryForValueByPath(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema)),
        path as string,
      ) as TypeDescriptorFactory<any>;

      expect(factory).not.toBeNull();
      expect(factory).toBeInstanceOf(Function);
      expect(factory(testValue)).toStrictEqual({
        [descriptorKey as string]: testValue instanceof Date ? testValue.toISOString() : testValue,
      });
    }
  });
});

describe("creation of descriptors for complete data structures", () => {
  it("should create a descriptor for scalar values", () => {
    const descriptorKeyToAttributesMap = [
      ["S", string(), "test_value"],
      ["N", number(), 999],
      ["B", binary(), new ArrayBuffer(8)],
      ["BOOL", bool(), false],
      ["S", date(), new Date()],
    ];

    for (const [descriptorKey, attribute, testValue] of descriptorKeyToAttributesMap) {
      const descriptor = transformValueToTypeDescriptor(
        attribute as Attribute<any, unknown>,
        // new TupleKeyValue(["field", attribute as Attribute<any, unknown>]),
        testValue,
      );

      expect(descriptor).toStrictEqual({
        [descriptorKey as string]: testValue instanceof Date ? testValue.toISOString() : testValue,
      });
    }

    expect.assertions(descriptorKeyToAttributesMap.length);
  });

  it("should create a descriptor for a schema with top-level fields", () => {
    const testSchema = schema()
      .add("field", string())
      .add("number_field", number())
      .add("bool", bool())
      .add("binary", binary())
      .add("date", date())
      .build();

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const dateValue = new Date("2024-02-14T01:22:37.560Z");
    const result = transformValueToTypeDescriptor(tupleMap, {
      field: "test_value",
      number_field: 999,
      bool: false,
      binary: new ArrayBuffer(8),
      date: dateValue,
    });

    expect(result).toStrictEqual({
      M: {
        field: { S: "test_value" },
        number_field: { N: 999 },
        bool: { BOOL: false },
        binary: { B: new ArrayBuffer(8) },
        date: { S: dateValue.toISOString() },
      },
    });
  });

  it("should create a descriptor for a schema with nested fields", () => {
    const testSchema = schema()
      .add(
        "map",
        map(
          schema()
            .add("field", string())
            .add("number_field", number())
            .add("bool", bool())
            .add("binary", binary())
            .add("date", date())
            .build(),
        ),
      )
      .build();

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const dateValue = new Date("2024-02-14T01:22:37.560Z");
    const result = transformValueToTypeDescriptor(tupleMap, {
      map: {
        field: "test_value_2",
        number_field: 999,
        bool: false,
        binary: new ArrayBuffer(8),
        date: dateValue,
      },
    });

    expect(result).toStrictEqual({
      M: {
        map: {
          M: {
            field: { S: "test_value_2" },
            number_field: { N: 999 },
            bool: { BOOL: false },
            binary: { B: new ArrayBuffer(8) },
            date: { S: dateValue.toISOString() },
          },
        },
      },
    });
  });

  it("should create a descriptor for a schema with maps inside lists", () => {
    const testSchema = schema()
      .add(
        "list",
        list(
          map(
            schema()
              .add("field", string())
              .add("number_field", number())
              .add("bool", bool())
              .add("binary", binary())
              .add("date", date())
              .build(),
          ),
        ),
      )
      .build();

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const dateValue = new Date("2024-02-14T01:22:37.560Z");
    const result = transformValueToTypeDescriptor(tupleMap, {
      list: [
        {
          field: "test_value_3",
          number_field: 999,
          bool: false,
          binary: new ArrayBuffer(8),
          date: dateValue,
        },
      ],
    });

    expect(result).toStrictEqual({
      M: {
        list: {
          L: [
            {
              M: {
                field: { S: "test_value_3" },
                number_field: { N: 999 },
                bool: { BOOL: false },
                binary: { B: new ArrayBuffer(8) },
                date: { S: dateValue.toISOString() },
              },
            },
          ],
        },
      },
    });
  });

  it("should create a descriptor for a schema with scalars inside lists", () => {
    const testSchema = schema().add("list", list(string())).add("list2", list(date())).build();

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const dateValue = new Date("2024-02-14T01:22:37.560Z");
    const result = transformValueToTypeDescriptor(tupleMap, {
      list: ["test_value_4"],
      list2: [dateValue],
    });

    expect(result).toStrictEqual({
      M: {
        list: {
          L: [{ S: "test_value_4" }],
        },
        list2: {
          L: [{ S: dateValue.toISOString() }],
        },
      },
    });
  });

  it("should create a descriptor for a schema with deeply nested lists and maps", () => {
    const testSchema = schema()
      .add("field", string())
      .add("number_field", number())
      .add("bool", bool())
      .add("binary", binary())
      .add("date", date())
      .add(
        "list",
        list(
          map(
            schema()
              .add("field", string())
              .add("number_field", number())
              .add("bool", bool())
              .add("binary", binary())
              .add("date", date())
              .add("nested_scalar_list", list(string()))
              .add("nested_map_list", list(map(schema().add("nested_field", string()).build())))
              .build(),
          ),
        ),
      )
      .add(
        "list2",
        list(
          map(
            schema()
              .add("field", string())
              .add("number_field", number())
              .add("bool", bool())
              .add("binary", binary())
              .add("date", date())
              .build(),
          ),
        ),
      )
      .build();

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const dateValue = new Date("2024-02-14T01:22:37.560Z");
    const result = transformValueToTypeDescriptor(tupleMap, {
      field: "test_value_5",
      number_field: 999,
      bool: false,
      binary: new ArrayBuffer(8),
      date: dateValue,
      list: [
        {
          field: "test_value_5",
          number_field: 999,
          bool: false,
          binary: new ArrayBuffer(8),
          date: dateValue,
          nested_scalar_list: ["test_value_5"],
          nested_map_list: [{ nested_field: "test_value_5" }],
        },
      ],
      list2: [
        {
          field: "test_value_6",
          number_field: 999,
          bool: false,
          binary: new ArrayBuffer(8),
          date: dateValue,
        },
      ],
    });

    expect(result).toStrictEqual({
      M: {
        field: { S: "test_value_5" },
        number_field: { N: 999 },
        bool: { BOOL: false },
        binary: { B: new ArrayBuffer(8) },
        date: { S: dateValue.toISOString() },
        list: {
          L: [
            {
              M: {
                field: { S: "test_value_5" },
                number_field: { N: 999 },
                bool: { BOOL: false },
                binary: { B: new ArrayBuffer(8) },
                date: { S: dateValue.toISOString() },
                nested_scalar_list: { L: [{ S: "test_value_5" }] },
                nested_map_list: {
                  L: [
                    {
                      M: {
                        nested_field: { S: "test_value_5" },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
        list2: {
          L: [
            {
              M: {
                field: { S: "test_value_6" },
                number_field: { N: 999 },
                bool: { BOOL: false },
                binary: { B: new ArrayBuffer(8) },
                date: { S: dateValue.toISOString() },
              },
            },
          ],
        },
      },
    });
  });

  it("should throw an error when a list is defined but another data structure is passed", () => {
    const testSchema = schema().add("list", list(string())).build();
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    expect(() => {
      transformValueToTypeDescriptor(tupleMap, { list: "test_value_7" });
    }).toThrow();
  });

  it("should throw an error when a map is defined but another data structure is passed", () => {
    const testSchema = schema()
      .add("map", map(schema().add("field", string()).build()))
      .build();
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    expect(() => {
      transformValueToTypeDescriptor(tupleMap, { map: "test_value_8" });
    }).toThrow();
  });

  it("should convert a partial schema value", () => {
    const testSchema = schema()
      .add("field", string())
      .add("number_field", number())
      .add("scalar_list", list(date()))
      .add(
        "map_list",
        list(
          map(
            schema().add("nested_field", string()).add("nested_field_2", number()).add("nested_date", date()).build(),
          ),
        ),
      )
      .add("map", map(schema().add("nested_field", string()).build()))
      .build();
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const dateValue = new Date("2024-02-14T01:22:37.560Z");
    const result = transformValueToTypeDescriptor(tupleMap, {
      field: "test_value_9",
      map_list: [{ nested_date: dateValue }],
    });

    expect(result).toStrictEqual({
      M: {
        field: { S: "test_value_9" },
        map_list: {
          L: [
            {
              M: {
                nested_date: { S: dateValue.toISOString() },
              },
            },
          ],
        },
      },
    });
  });
});
