import {
  Attribute,
  binary,
  bool,
  date,
  list,
  map,
  Nullable,
  number,
  Optional,
  string,
} from "../../attribute/attribute";
import { TupleKeyValue, TupleMap } from "../schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema.builder";
import { schema } from "../schema.facade";
import {
  booleanDescriptorFactory, dateDescriptorFactory,
  getDescriptorFactoryForValue,
  getDescriptorFactoryForValueByPath, listDescriptorFactory,
  mapDescriptorFactory, nullDescriptorFactory, numberDescriptorFactory, stringDescriptorFactory,
  transformValueToTypeDescriptor,
  TypeDescriptorFactory,
} from "../type-descriptor-converters/schema-type-descriptors.encoders";

const notOptionalAndNotNullable: Optional<boolean> & Nullable<boolean> = {
  isNullable: false,
  isOptional: false,
};

describe("creation of descriptors by values", () => {
  it("should create a descriptor for simple attributes", () => {
    const descriptorKeysToAttributesSpec = [
      ["S", string(), "test_value"],
      ["N", number(), "999"],
      ["B", binary(), new ArrayBuffer(8)],
      ["BOOL", bool(), false],
      ["S", date(), new Date()],
    ];

    for (const [descriptorKey, attribute, testValue] of descriptorKeysToAttributesSpec) {
      //   console.log({ descriptorKey, attribute, testValue });
      const factory = getDescriptorFactoryForValue(attribute) as TypeDescriptorFactory;

      expect(factory).not.toBeNull();
      expect(factory).toBeInstanceOf(Function);
      expect(factory(testValue)).toStrictEqual({
        [descriptorKey as string]: testValue instanceof Date ? testValue.toISOString() : testValue,
      });
    }
  });

  it("should create a descriptor for complex attributes", () => {
    const descriptorKeysToAttributesSpec = [
      ["M", new TupleMap("MAP", [["field", string()]], notOptionalAndNotNullable), new TupleMap("MAP", [["field", string()]], notOptionalAndNotNullable)],
      ["L", new TupleMap("LIST", [["field", number()]], notOptionalAndNotNullable), new TupleMap("LIST", [["field", number()]], notOptionalAndNotNullable)],
    ];

    for (const [descriptorKey, attribute, testValue] of descriptorKeysToAttributesSpec) {
      //   console.log({ descriptorKey, attribute, testValue });
      const factory = getDescriptorFactoryForValue(attribute) as TypeDescriptorFactory;

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
      ["N", "number_field", "999"],
      ["BOOL", "bool", false],
      ["B", "binary", new ArrayBuffer(8)],
      ["S", "date", new Date()],
    ];

    for (const [descriptorKey, path, testValue] of descriptorKeysToPathsSpec) {
      //   console.log({ descriptorKey, path, testValue });
      const factory = getDescriptorFactoryForValueByPath(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable),
        path as string,
      ) as TypeDescriptorFactory;

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
      ["M", "map", new TupleMap("MAP", [["field", string()]], notOptionalAndNotNullable)],
      ["L", "list", new TupleMap("LIST", [["field", number()]], notOptionalAndNotNullable)],
    ];

    for (const [descriptorKey, path, testValue] of descriptorKeysToPathsSpec) {
      //   console.log({ descriptorKey, path, testValue });
      const factory = getDescriptorFactoryForValueByPath(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable),
        path as string,
      ) as TypeDescriptorFactory;

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
      ["N", "map.number_field", "999"],
      ["B", "map.binary", new ArrayBuffer(8)],
      ["BOOL", "map.bool", false],
      ["S", "map.date", new Date()],
    ];

    for (const [descriptorKey, path, testValue] of descriptorKeysToPathsSpec) {
      //   console.log({ descriptorKey, path, testValue });
      const factory = getDescriptorFactoryForValueByPath(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable),
        path as string,
      ) as TypeDescriptorFactory;

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
      ["N", "list.0.number_field", "999"],
      ["B", "list.0.binary", new ArrayBuffer(8)],
      ["BOOL", "list.0.bool", false],
      ["S", "list.0.date", new Date()],
    ];

    for (const [descriptorKey, path, testValue] of descriptorKeysToPathsSpec) {
      //   console.log({ descriptorKey, path, testValue });
      const factory = getDescriptorFactoryForValueByPath(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable),
        path as string,
      ) as TypeDescriptorFactory;

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
      ["N", number(), "999"],
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

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

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
        number_field: { N: "999" },
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

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

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
            number_field: { N: "999" },
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

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

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
                number_field: { N: "999" },
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

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

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

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

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
        number_field: { N: "999" },
        bool: { BOOL: false },
        binary: { B: new ArrayBuffer(8) },
        date: { S: dateValue.toISOString() },
        list: {
          L: [
            {
              M: {
                field: { S: "test_value_5" },
                number_field: { N: "999" },
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
                number_field: { N: "999" },
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
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

    expect(() => {
      transformValueToTypeDescriptor(tupleMap, { list: "test_value_7" });
    }).toThrow();
  });

  it("should throw an error when a map is defined but another data structure is passed", () => {
    const testSchema = schema()
      .add("map", map(schema().add("field", string()).build()))
      .build();
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

    expect(() => {
      transformValueToTypeDescriptor(tupleMap, { map: "test_value_8" });
    }).toThrow();
  });
});

describe("creation of schemas with optional and nullable fields", () => {
  describe("top level optional fields", () => {
    const testSchema = schema()
      .add("name", string().optional())
      .add("age", number().optional())
      .add("is_active", bool().optional())
      .add("created_at", date().optional())
      .add("map", map(schema().add("nested_field", string()).build()).optional())
      .add("list_scalar", list(string()).optional())
      .add("list_map", list(map(schema().add("nested_field", string()).build())).optional())
      .build();

    const schemaMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

    it("should convert the value with all fields optional and missed", () => {
      const result = transformValueToTypeDescriptor(schemaMap, {});

      expect(result).toStrictEqual({
        M: {},
      });
    });

    it("should convert the value with all fields optional and only scalar ones present", () => {
      const dateValue = new Date("2024-02-14T01:22:37.560Z");
      const result = transformValueToTypeDescriptor(schemaMap, {
        name: "test_value",
        age: 999,
        is_active: false,
        created_at: dateValue,
      });

      expect(result).toStrictEqual({
        M: {
          name: { S: "test_value" },
          age: { N: "999" },
          is_active: { BOOL: false },
          created_at: { S: dateValue.toISOString() },
        },
      });
    });

    it("should convert the value with all fields optional and only complex ones present", () => {
      const result = transformValueToTypeDescriptor(schemaMap, {
        map: { nested_field: "test_value" },
        list_scalar: ["test_value"],
        list_map: [{ nested_field: "test_value" }],
      });

      expect(result).toStrictEqual({
        M: {
          map: {
            M: {
              nested_field: { S: "test_value" },
            },
          },
          list_scalar: { L: [{ S: "test_value" }] },
          list_map: {
            L: [
              {
                M: {
                  nested_field: { S: "test_value" },
                },
              },
            ],
          },
        },
      });
    });

    it("should convert the value with all fields optional and present", () => {
      const dateValue = new Date("2024-02-14T01:22:37.560Z");
      const result = transformValueToTypeDescriptor(schemaMap, {
        name: "test_value",
        age: 999,
        is_active: false,
        created_at: dateValue,
        map: { nested_field: "test_value" },
        list_scalar: ["test_value"],
        list_map: [{ nested_field: "test_value" }],
      });

      expect(result).toStrictEqual({
        M: {
          name: { S: "test_value" },
          age: { N: "999" },
          is_active: { BOOL: false },
          created_at: { S: dateValue.toISOString() },
          map: {
            M: {
              nested_field: { S: "test_value" },
            },
          },
          list_scalar: { L: [{ S: "test_value" }] },
          list_map: {
            L: [
              {
                M: {
                  nested_field: { S: "test_value" },
                },
              },
            ],
          },
        },
      });
    });

    it("should convert the value with fields both required and optional and partially present", () => {
      const testSchema = schema()
        .add("name", string())
        .add("age", number())
        .add("is_active", bool().optional())
        .add("created_at", date().optional())
        .build();

      const schemaMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      const dateValue = new Date("2024-02-14T01:22:37.560Z");
      const result = transformValueToTypeDescriptor(schemaMap, {
        name: "test_value",
        age: 999,
        created_at: dateValue,
      });

      expect(result).toStrictEqual(mapDescriptorFactory({
        name: stringDescriptorFactory("test_value"),
        age: numberDescriptorFactory(999),
        created_at: dateDescriptorFactory(dateValue),
      }));
    });

    it("should throw if a non-optional field is missed", () => {
      const testSchema = schema()
        .add("name", string())
        .add("age", number().optional())
        .build();

      const schemaMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      expect(() => {
        transformValueToTypeDescriptor(schemaMap, {
          age: 20,
        });
      }).toThrow();
    });

    it("should throw if an optional field is null", () => {
      const testSchema = schema()
        .add("name", string().optional())
        .add("age", number().optional())
        .build();

      const schemaMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      expect(() => {
        transformValueToTypeDescriptor(schemaMap, {
          name: "test_value",
          age: null,
        });
      }).toThrow();
    });
  });

  describe("top level nullable fields", () => {
    const testSchema = schema()
      .add("name", string().nullable())
      .add("age", number().nullable())
      .add("is_active", bool().nullable())
      .add("created_at", date().nullable())
      .add("map", map(schema().add("nested_field", string()).build()).nullable())
      .add("list_scalar", list(string()).nullable())
      .add("list_map", list(map(schema().add("nested_field", string()).build())).nullable())
      .build();

    it("should convert the value with all fields nullable and set to null", () => {
      const result = transformValueToTypeDescriptor(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable),
        {
          name: null,
          age: null,
          is_active: null,
          created_at: null,
          map: null,
          list_scalar: null,
          list_map: null,
        },
      );

      expect(result).toStrictEqual(mapDescriptorFactory({
        name: nullDescriptorFactory(null),
        age: nullDescriptorFactory(null),
        is_active: nullDescriptorFactory(null),
        created_at: nullDescriptorFactory(null),
        map: nullDescriptorFactory(null),
        list_scalar: nullDescriptorFactory(null),
        list_map: nullDescriptorFactory(null),
      }));
    });

    it("should convert the value with all fields nullable and only scalar ones not null", () => {
      const dateValue = new Date("2024-02-14T01:22:37.560Z");
      const result = transformValueToTypeDescriptor(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable),
        {
          name: "test_value",
          age: 999,
          is_active: false,
          created_at: dateValue,
          map: null,
          list_scalar: null,
          list_map: null,
        },
      );

      expect(result).toStrictEqual(mapDescriptorFactory({
        name: stringDescriptorFactory("test_value"),
        age: numberDescriptorFactory(999),
        is_active: booleanDescriptorFactory(false),
        created_at: dateDescriptorFactory(dateValue),
        map: nullDescriptorFactory(null),
        list_scalar: nullDescriptorFactory(null),
        list_map: nullDescriptorFactory(null),
      }));
    });

    it("should convert the value with all fields nullable and only complex ones not null", () => {
      const result = transformValueToTypeDescriptor(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable),
        {
          name: null,
          age: null,
          is_active: null,
          created_at: null,
          map: { nested_field: "test_value" },
          list_scalar: ["test_value"],
          list_map: [{ nested_field: "test_value" }],
        },
      );

      expect(result).toStrictEqual(mapDescriptorFactory({
        name: nullDescriptorFactory(null),
        age: nullDescriptorFactory(null),
        is_active: nullDescriptorFactory(null),
        created_at: nullDescriptorFactory(null),
        map: mapDescriptorFactory({
          nested_field: stringDescriptorFactory("test_value"),
        }),
        list_scalar: listDescriptorFactory([stringDescriptorFactory("test_value")]),
        list_map: listDescriptorFactory([mapDescriptorFactory({
          nested_field: stringDescriptorFactory("test_value"),
        })]),
      }));
    });

    it("should convert the value with all fields nullable and not null", () => {
      const dateValue = new Date("2024-02-14T01:22:37.560Z");
      const result = transformValueToTypeDescriptor(
        new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable),
        {
          name: "test_value",
          age: 999,
          is_active: false,
          created_at: dateValue,
          map: { nested_field: "test_value" },
          list_scalar: ["test_value"],
          list_map: [{ nested_field: "test_value" }],
        },
      );

      expect(result).toStrictEqual(mapDescriptorFactory({
        name: stringDescriptorFactory("test_value"),
        age: numberDescriptorFactory(999),
        is_active: booleanDescriptorFactory(false),
        created_at: dateDescriptorFactory(dateValue),
        map: mapDescriptorFactory({
          nested_field: stringDescriptorFactory("test_value"),
        }),
        list_scalar: listDescriptorFactory([stringDescriptorFactory("test_value")]),
        list_map: listDescriptorFactory([mapDescriptorFactory({
          nested_field: stringDescriptorFactory("test_value"),
        })]),
      }));
    });

    it("should convert the value with fields both required and nullable and partially set to null", () => {
      const testSchema = schema()
        .add("name", string())
        .add("age", number())
        .add("is_active", bool().nullable())
        .add("created_at", date().nullable())
        .build();

      const schemaMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      const dateValue = new Date("2024-02-14T01:22:37.560Z");
      const result = transformValueToTypeDescriptor(schemaMap, {
        name: "test_value",
        age: 999,
        is_active: null,
        created_at: dateValue,
      });

      expect(result).toStrictEqual(mapDescriptorFactory({
        name: stringDescriptorFactory("test_value"),
        age: numberDescriptorFactory(999),
        is_active: nullDescriptorFactory(null),
        created_at: dateDescriptorFactory(dateValue),
      }));
    });

    it("should throw if a non-nullable field is null", () => {
      const testSchema = schema()
        .add("name", string())
        .add("age", number().nullable())
        .build();

      const testMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      expect(() => {
        transformValueToTypeDescriptor(testMap, {
          name: null,
          age: 10,
        });
      }).toThrow();
    });

    it("should throw if a non-nullable field is missed", () => {
      const testSchema = schema()
        .add("name", string())
        .add("age", number().nullable())
        .build();

      const testMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      expect(() => {
        transformValueToTypeDescriptor(testMap, {
          age: 10,
        });
      }).toThrow();
    });

    it("should throw if a nullable field is missed", () => {
      const testSchema = schema()
        .add("name", string().nullable())
        .add("age", number().nullable())
        .build();

      const testMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      expect(() => {
        transformValueToTypeDescriptor(testMap, {});
      }).toThrow();
    });
  });

  describe("nested nullable fields", () => {
    describe("nested maps", () => {
      const testSchema = schema()
        .add("map", map(
          schema()
            .add("name", string().nullable())
            .add("age", number().nullable())
            .add("created_ad", date().nullable())
            .add("is_active", bool().nullable())
            .add("address",
              map(
                schema()
                  .add("street", string())
                  .add("number", number().nullable())
                  .build(),
              ).nullable(),
            )
            .add("list_scalar", list(string()).nullable())
            .add("list_map",
              list(
                map(
                  schema()
                    .add("nested_field_optional", number().nullable())
                    .build(),
                ).nullable(),
              ).nullable(),
            )
            .build(),
        ))
        .build();

      const testMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      it("should convert a value with nested map where fields nullable and all set to null", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          map: {
            name: null,
            age: null,
            created_ad: null,
            is_active: null,
            address: null,
            list_scalar: null,
            list_map: null,
          },
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({
            name: nullDescriptorFactory(null),
            age: nullDescriptorFactory(null),
            created_ad: nullDescriptorFactory(null),
            is_active: nullDescriptorFactory(null),
            address: nullDescriptorFactory(null),
            list_scalar: nullDescriptorFactory(null),
            list_map: nullDescriptorFactory(null),
          }),
        }));
      });

      it("should convert a value with nested map where fields nullable and none set to null", () => {
        const createdAtValue = new Date("2024-02-14T01:22:37.560Z");
        const result = transformValueToTypeDescriptor(testMap, {
          map: {
            name: "test_value",
            age: 999,
            created_ad: createdAtValue,
            is_active: false,
            address: {
              street: "test_street",
              number: 999,
            },
            list_scalar: ["test_value"],
            list_map: [{
              nested_field_optional: 999,
            }],
          },
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({
            name: stringDescriptorFactory("test_value"),
            age: numberDescriptorFactory(999),
            created_ad: dateDescriptorFactory(createdAtValue),
            is_active: booleanDescriptorFactory(false),
            address: mapDescriptorFactory({
              street: stringDescriptorFactory("test_street"),
              number: numberDescriptorFactory(999),
            }),
            list_scalar: listDescriptorFactory([stringDescriptorFactory("test_value")]),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field_optional: numberDescriptorFactory(999),
            })]),
          }),
        }));
      });

      it("should convert a value with nested map where fields nullable and only scalar not set to null", () => {
        const createdAtValue = new Date("2024-02-14T01:22:37.560Z");
        const result = transformValueToTypeDescriptor(testMap, {
          map: {
            name: "test_value",
            age: 999,
            created_ad: createdAtValue,
            is_active: false,
            address: null,
            list_scalar: null,
            list_map: null,
          },
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({
            name: stringDescriptorFactory("test_value"),
            age: numberDescriptorFactory(999),
            created_ad: dateDescriptorFactory(createdAtValue),
            is_active: booleanDescriptorFactory(false),
            address: nullDescriptorFactory(null),
            list_scalar: nullDescriptorFactory(null),
            list_map: nullDescriptorFactory(null),
          }),
        }));
      });

      it("should convert a value with nested map where fields nullable and only complex not set to null", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          map: {
            name: null,
            age: null,
            created_ad: null,
            is_active: null,
            address: {
              street: "test_street",
              number: 999,
            },
            list_scalar: ["test_value"],
            list_map: [{
              nested_field_optional: 999,
            }],
          },
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({
            name: nullDescriptorFactory(null),
            age: nullDescriptorFactory(null),
            created_ad: nullDescriptorFactory(null),
            is_active: nullDescriptorFactory(null),
            address: mapDescriptorFactory({
              street: stringDescriptorFactory("test_street"),
              number: numberDescriptorFactory(999),
            }),
            list_scalar: listDescriptorFactory([stringDescriptorFactory("test_value")]),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field_optional: numberDescriptorFactory(999),
            })]),
          }),
        }));
      });

      it("should convert a value with nested map where fields both required and nullable and partially specified", () => {
        const createdAtValue = new Date("2024-02-14T01:22:37.560Z");
        const result = transformValueToTypeDescriptor(testMap, {
          map: {
            name: null,
            age: 999,
            created_ad: null,
            is_active: false,
            address: {
              street: "test_street",
              number: null,
            },
            list_scalar: null,
            list_map: [{
              nested_field_optional: 999,
            }],
          },
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({
            name: nullDescriptorFactory(null),
            age: numberDescriptorFactory(999),
            created_ad: nullDescriptorFactory(null),
            is_active: booleanDescriptorFactory(false),
            address: mapDescriptorFactory({
              street: stringDescriptorFactory("test_street"),
              number: nullDescriptorFactory(null),
            }),
            list_scalar: nullDescriptorFactory(null),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field_optional: numberDescriptorFactory(999),
            })]),
          }),
        }));
      });

      it("should throw if a nested non-nullable field is set to null", () => {
        expect(() => {
          transformValueToTypeDescriptor(testMap, {
            map: {
              name: null,
              age: 999,
              created_ad: null,
              is_active: false,
              address: {
                street: null,
                number: 999,
              },
              list_scalar: ["test_value"],
              list_map: [{
                nested_field_optional: 999,
              }],
            },
          });
        }).toThrow();
      });

      it("should throw if a nested not-nullable field is missed", () => {
        expect(() => {
          transformValueToTypeDescriptor(testMap, {
            map: {
              name: null,
              age: 999,
              created_ad: null,
              is_active: false,
              address: {
                // street: "test_value",
                number: 999,
              },
              list_scalar: ["test_value"],
              list_map: [{
                nested_field_optional: 999,
              }],
            },
          });
        }).toThrow();
      });

      it("should throw if a nested nullable field is missed", () => {
        expect(() => {
          transformValueToTypeDescriptor(testMap, {
            map: {
              name: null,
              age: 999,
              created_ad: null,
              is_active: false,
              address: {
                street: null,
                // number: 999,
              },
              list_scalar: ["test_value"],
              list_map: [{
                nested_field_optional: 999,
              }],
            },
          });
        }).toThrow();
      });
    });

    describe("nested lists", () => {
      const testSchema = schema()
        .add("list", list(
          map(
            schema()
              .add("name", string().nullable())
              .add("age", number().nullable())
              .add("is_active", bool().nullable())
              .add("created_at", date().nullable())
              .add("list_scalar", list(number()).nullable())
              .add("list_map", list(map(
                schema()
                  .add("nested_field", number())
                  .add("nested_field_optional", string().nullable())
                  .add("nested_map", map(
                    schema()
                      .add("doubly_nested_field", bool())
                      .build(),
                  ).nullable())
                  .build(),
              )))
              .build(),
          ),
        ))
        .build();

      const testMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      it("should convert a value with nested list of maps fields nullable and all set to null", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          list: [{
            name: null,
            age: null,
            is_active: null,
            created_at: null,
            list_scalar: null,
            list_map: [{
              nested_field: 999,
              nested_field_optional: null,
              nested_map: null,
            }],
          }],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([mapDescriptorFactory({
            name: nullDescriptorFactory(null),
            age: nullDescriptorFactory(null),
            is_active: nullDescriptorFactory(null),
            created_at: nullDescriptorFactory(null),
            list_scalar: nullDescriptorFactory(null),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field: numberDescriptorFactory(999),
              nested_field_optional: nullDescriptorFactory(null),
              nested_map: nullDescriptorFactory(null),
            })]),
          })]),
        }));
      });

      it("should convert a value with nested list of maps fields nullable and no one set to null", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          list: [{
            name: "test_value",
            age: 999,
            is_active: false,
            created_at: new Date("2024-02-14T01:22:37.560Z"),
            list_scalar: [999],
            list_map: [{
              nested_field: 999,
              nested_field_optional: "test_value",
              nested_map: {
                doubly_nested_field: true,
              },
            }],
          }],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([mapDescriptorFactory({
            name: stringDescriptorFactory("test_value"),
            age: numberDescriptorFactory(999),
            is_active: booleanDescriptorFactory(false),
            created_at: dateDescriptorFactory(new Date("2024-02-14T01:22:37.560Z")),
            list_scalar: listDescriptorFactory([numberDescriptorFactory(999)]),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field: numberDescriptorFactory(999),
              nested_field_optional: stringDescriptorFactory("test_value"),
              nested_map: mapDescriptorFactory({
                doubly_nested_field: booleanDescriptorFactory(true),
              }),
            })]),
          })]),
        }));
      });

      it("should convert a value with nested list of maps fields nullable and only scalar not set to null", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          list: [{
            name: "test_value",
            age: 999,
            is_active: false,
            created_at: new Date("2024-02-14T01:22:37.560Z"),
            list_scalar: null,
            list_map: [],
          }],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([mapDescriptorFactory({
            name: stringDescriptorFactory("test_value"),
            age: numberDescriptorFactory(999),
            is_active: booleanDescriptorFactory(false),
            created_at: dateDescriptorFactory(new Date("2024-02-14T01:22:37.560Z")),
            list_scalar: nullDescriptorFactory(null),
            list_map: listDescriptorFactory([]),
          })]),
        }));
      });

      it("should convert a value with nested list of maps fields nullable and only complex not set to null", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          list: [{
            name: null,
            age: null,
            is_active: null,
            created_at: null,
            list_scalar: [999],
            list_map: [{
              nested_field: 999,
              nested_field_optional: "test_value",
              nested_map: {
                doubly_nested_field: true,
              },
            }],
          }],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([mapDescriptorFactory({
            name: nullDescriptorFactory(null),
            age: nullDescriptorFactory(null),
            is_active: nullDescriptorFactory(null),
            created_at: nullDescriptorFactory(null),
            list_scalar: listDescriptorFactory([numberDescriptorFactory(999)]),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field: numberDescriptorFactory(999),
              nested_field_optional: stringDescriptorFactory("test_value"),
              nested_map: mapDescriptorFactory({
                doubly_nested_field: booleanDescriptorFactory(true),
              }),
            })]),
          })]),
        }));
      });

      it("should convert a value with nested list of maps where fields both required and nullable and partially nulled", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          list: [{
            name: "test_value",
            age: null,
            is_active: null,
            created_at: new Date("2024-02-14T01:22:37.560Z"),
            list_scalar: null,
            list_map: [{
              nested_field: 999,
              nested_field_optional: null,
              nested_map: {
                doubly_nested_field: false,
              },
            }],
          }],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([mapDescriptorFactory({
            name: stringDescriptorFactory("test_value"),
            age: nullDescriptorFactory(null),
            is_active: nullDescriptorFactory(null),
            created_at: dateDescriptorFactory(new Date("2024-02-14T01:22:37.560Z")),
            list_scalar: nullDescriptorFactory(null),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field: numberDescriptorFactory(999),
              nested_field_optional: nullDescriptorFactory(null),
              nested_map: mapDescriptorFactory({
                doubly_nested_field: booleanDescriptorFactory(false),
              }),
            })]),
          })]),
        }));
      });

      it("should throw if list-nested non-optional field is missed", () => {
        expect(() => {
          transformValueToTypeDescriptor(testMap, {
            list: [{
              name: "test_value",
              age: 999,
              is_active: false,
              created_at: new Date("2024-02-14T01:22:37.560Z"),
              list_scalar: [999],
              list_map: [{
                nested_field: 999,
                nested_field_optional: "test_value",
                nested_map: {
                  doubly_nested_field: null,
                },
              }],
            }],
          });
        }).toThrow();
      });
    });
  });

  describe("nested optional fields", () => {
    describe("nested maps", () => {
      const testSchema = schema()
        .add("map", map(
          schema()
            .add("name", string().optional())
            .add("age", number().optional())
            .add("created_ad", date().optional())
            .add("is_active", bool().optional())
            .add("address",
              map(
                schema()
                  .add("street", string())
                  .add("number", number().optional())
                  .build(),
              ).optional(),
            )
            .add("list_scalar", list(string()).optional())
            .add("list_map",
              list(
                map(
                  schema()
                    .add("nested_field", string())
                    .add("nested_field_optional", number().optional())
                    .build(),
                ).optional(),
              ).optional(),
            )
            .build(),
        ))
        .build();

      const testMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      it("should convert a value with nested map fields optional and missed", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          map: {},
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({}),
        }));
      });

      it("should convert a value with nested map fields optional and present", () => {
        const dateValue = new Date("2024-02-14T01:22:37.560Z");
        const result = transformValueToTypeDescriptor(testMap, {
          map: {
            name: "test_value",
            age: 999,
            created_ad: dateValue,
            is_active: false,
            address: {
              street: "test_street",
              number: 999,
            },
            list_scalar: ["test_value"],
            list_map: [{ nested_field: "test_value", nested_field_optional: 888 }],
          },
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({
            name: stringDescriptorFactory("test_value"),
            age: numberDescriptorFactory(999),
            created_ad: dateDescriptorFactory(dateValue),
            is_active: booleanDescriptorFactory(false),
            address: mapDescriptorFactory({
              street: stringDescriptorFactory("test_street"),
              number: numberDescriptorFactory(999),
            }),
            list_scalar: listDescriptorFactory([stringDescriptorFactory("test_value")]),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field: stringDescriptorFactory("test_value"),
              nested_field_optional: numberDescriptorFactory(888),
            })]),
          }),
        }));
      });

      it("should convert a value with nested map fields optional and only scalar present", () => {
        const dateValue = new Date("2024-02-14T01:22:37.560Z");
        const result = transformValueToTypeDescriptor(testMap, {
          map: {
            name: "test_value",
            age: 999,
            created_ad: dateValue,
            is_active: false,
          },
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({
            name: stringDescriptorFactory("test_value"),
            age: numberDescriptorFactory(999),
            created_ad: dateDescriptorFactory(dateValue),
            is_active: booleanDescriptorFactory(false),
          }),
        }));
      });

      it("should convert a value with nested map fields optional and only complex present", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          map: {
            address: {
              street: "test_street",
              number: 999,
            },
            list_scalar: ["test_value"],
            list_map: [{ nested_field: "test_value", nested_field_optional: 888 }],
          },
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({
            address: mapDescriptorFactory({
              street: stringDescriptorFactory("test_street"),
              number: numberDescriptorFactory(999),
            }),
            list_scalar: listDescriptorFactory([stringDescriptorFactory("test_value")]),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field: stringDescriptorFactory("test_value"),
              nested_field_optional: numberDescriptorFactory(888),
            })]),
          }),
        }));
      });

      it("should convert a value with nested map fields both required and optional and partially specified", () => {
        const dateValue = new Date("2024-02-14T01:22:37.560Z");
        const result = transformValueToTypeDescriptor(testMap, {
          map: {
            name: "test_value",
            is_active: true,
            created_ad: dateValue,
            address: {
              street: "test_street",
            },
            list_map: [{ nested_field: "test_value" }],
          },
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          map: mapDescriptorFactory({
            name: stringDescriptorFactory("test_value"),
            is_active: booleanDescriptorFactory(true),
            created_ad: dateDescriptorFactory(dateValue),
            address: mapDescriptorFactory({
              street: stringDescriptorFactory("test_street"),
            }),
            list_map: listDescriptorFactory([mapDescriptorFactory({
              nested_field: stringDescriptorFactory("test_value"),
            })]),
          }),
        }));
      });

      it("should throw if a nested non-optional field is missed", () => {
        expect(() => {
          transformValueToTypeDescriptor(testMap, {
            address: {
              number: 999,
            },
          });
        }).toThrow();
      });
    });

    describe("nested lists", () => {
      const testSchema = schema()
        .add("list", list(
          map(
            schema()
              .add("name", string().optional())
              .add("age", number().optional())
              .add("is_active", bool().optional())
              .add("created_at", date().optional())
              .add("list_scalar", list(number()).optional())
              .add("list_map", list(map(
                schema()
                  .add("nested_field", number())
                  .add("nested_field_optional", string().optional())
                  .add("nested_map", map(
                    schema()
                      .add("doubly_nested_field", bool())
                      .build(),
                  ).optional())
                  .build(),
              )))
              .build(),
          ),
        ))
        .build();

      const testMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema), notOptionalAndNotNullable);

      it("should convert a value with nested list of maps fields optional and missed", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          list: [],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([]),
        }));
      });

      it("should convert a value with nested list of maps fields optional and present", () => {
        const dateValue = new Date("2024-02-14T01:22:37.560Z");
        const result = transformValueToTypeDescriptor(testMap, {
          list: [{
            name: "test_value",
            age: 999,
            is_active: false,
            created_at: dateValue,
            list_scalar: [777],
            list_map: [{
              nested_field: 888,
              nested_field_optional: "test_value_2",
              nested_map: {
                doubly_nested_field: true,
              },
            }],
          }],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([
            mapDescriptorFactory({
              name: stringDescriptorFactory("test_value"),
              age: numberDescriptorFactory(999),
              is_active: booleanDescriptorFactory(false),
              created_at: dateDescriptorFactory(dateValue),
              list_scalar: listDescriptorFactory([numberDescriptorFactory(777)]),
              list_map: listDescriptorFactory([
                mapDescriptorFactory(({
                  nested_field: numberDescriptorFactory(888),
                  nested_field_optional: stringDescriptorFactory("test_value_2"),
                  nested_map: mapDescriptorFactory({
                    doubly_nested_field: booleanDescriptorFactory(true),
                  }),
                })),
              ]),
            }),
          ]),
        }));
      });

      it("should convert a value with nested list of maps fields optional and only scalar present", () => {
        const dateValue = new Date("2024-02-14T01:22:37.560Z");
        const result = transformValueToTypeDescriptor(testMap, {
          list: [{
            name: "test_value",
            age: 999,
            is_active: false,
            created_at: dateValue,
            list_map: [],
          }],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([
            mapDescriptorFactory({
              name: stringDescriptorFactory("test_value"),
              age: numberDescriptorFactory(999),
              is_active: booleanDescriptorFactory(false),
              created_at: dateDescriptorFactory(dateValue),
              list_map: listDescriptorFactory([]),
            }),
          ]),
        }));
      });

      it("should convert a value with nested list of maps fields optional and only complex present", () => {
        const result = transformValueToTypeDescriptor(testMap, {
          list: [{
            list_scalar: [777],
            list_map: [{
              nested_field: 888,
              nested_map: {
                doubly_nested_field: true,
              },
            }],
          }],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([
            mapDescriptorFactory({
              list_scalar: listDescriptorFactory([numberDescriptorFactory(777)]),
              list_map: listDescriptorFactory([
                mapDescriptorFactory(({
                  nested_field: numberDescriptorFactory(888),
                  nested_map: mapDescriptorFactory({
                    doubly_nested_field: booleanDescriptorFactory(true),
                  }),
                })),
              ]),
            }),
          ]),
        }));
      });

      it("should convert a value with nested list of maps fields both required and optional and partially specified", () => {
        const dateValue = new Date("2024-02-14T01:22:37.560Z");
        const result = transformValueToTypeDescriptor(testMap, {
          list: [{
            is_active: false,
            created_at: dateValue,
            list_scalar: [777],
            list_map: [{
              nested_field: 888,
              nested_map: {
                doubly_nested_field: true,
              },
            }],
          }],
        });

        expect(result).toStrictEqual(mapDescriptorFactory({
          list: listDescriptorFactory([
            mapDescriptorFactory({
              is_active: booleanDescriptorFactory(false),
              created_at: dateDescriptorFactory(dateValue),
              list_scalar: listDescriptorFactory([numberDescriptorFactory(777)]),
              list_map: listDescriptorFactory([
                mapDescriptorFactory(({
                  nested_field: numberDescriptorFactory(888),
                  nested_map: mapDescriptorFactory({
                    doubly_nested_field: booleanDescriptorFactory(true),
                  }),
                })),
              ]),
            }),
          ]),
        }));
      });

      it("should throw if list-nested non-optional field is missed", () => {
        expect(() => {
          transformValueToTypeDescriptor(testMap, {
            list: [{
              list_map: [{
                nested_field_optional: "test_value_2",
                nested_map: {
                  doubly_nested_field: true,
                },
              }],
            }],
          });
        }).toThrow();
      });
    });
  });
});
