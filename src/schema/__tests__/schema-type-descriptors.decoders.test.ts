import { schema } from "../schema.facade";
import { bool, date, list, map, Nullable, number, Optional, string } from "../../attribute/attribute";
import { extractSchemaBuilderResult } from "../schema.builder";
import { TupleMap } from "../schema-tuple-map.facade";
import { transformTypeDescriptorToValue } from "../type-descriptor-converters/schema-type-descriptors.decoders";
import {
  booleanDescriptorFactory, dateDescriptorFactory, listDescriptorFactory, mapDescriptorFactory,
  numberDescriptorFactory,
  stringDescriptorFactory,
} from "../type-descriptor-converters/schema-type-descriptors.encoders";

const notNullableAndNotOptional: Optional<boolean> & Nullable<boolean> = {
  isNullable: false,
  isOptional: false,
};

describe("general usage", () => {
  const topLevelScalarsSchema = schema()
    .add("name", string())
    .add("age", number())
    .add("is_active", bool())
    .add("created_at", date())
    .build();

  const complexValuesSchema = schema()
    .add("map", map(topLevelScalarsSchema))
    .add("list_scalars", list(number()))
    .add("list_maps", list(map(topLevelScalarsSchema)))
    .build();

  it("should decode a value with scalar fields", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(topLevelScalarsSchema), notNullableAndNotOptional);

    const createdAtValue = new Date("2021-01-01T00:00:00.000Z");
    const result = transformTypeDescriptorToValue(tupleMap, {
      name: stringDescriptorFactory("test_value"),
      age: numberDescriptorFactory(999),
      is_active: booleanDescriptorFactory(false),
      created_at: dateDescriptorFactory(createdAtValue),
    });

    expect(result).toStrictEqual({
      name: "test_value",
      age: 999,
      is_active: false,
      created_at: createdAtValue,
    });
  });

  it("should decode a value with maps and lists", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(complexValuesSchema), notNullableAndNotOptional);

    const createdAtValue = new Date("2021-01-01T00:00:00.000Z");
    const result = transformTypeDescriptorToValue(tupleMap, {
      map: mapDescriptorFactory({
        name: stringDescriptorFactory("test_value"),
        age: numberDescriptorFactory(999),
        is_active: booleanDescriptorFactory(false),
        created_at: dateDescriptorFactory(createdAtValue),
      }),
      list_scalars: listDescriptorFactory([
        numberDescriptorFactory(1),
        numberDescriptorFactory(2),
        numberDescriptorFactory(3),
      ]),
      list_maps: listDescriptorFactory([
        mapDescriptorFactory({
          name: stringDescriptorFactory("test_value"),
          age: numberDescriptorFactory(999),
          is_active: booleanDescriptorFactory(false),
          created_at: dateDescriptorFactory(createdAtValue),
        }),
        mapDescriptorFactory({
          name: stringDescriptorFactory("test_value"),
          age: numberDescriptorFactory(999),
          is_active: booleanDescriptorFactory(false),
          created_at: dateDescriptorFactory(createdAtValue),
        }),
      ]),
    });

    expect(result).toStrictEqual({
      map: {
        name: "test_value",
        age: 999,
        is_active: false,
        created_at: createdAtValue,
      },
      list_scalars: [1, 2, 3],
      list_maps: [
        {
          name: "test_value",
          age: 999,
          is_active: false,
          created_at: createdAtValue,
        },
        {
          name: "test_value",
          age: 999,
          is_active: false,
          created_at: createdAtValue,
        },
      ],
    });
  });

  it("should decode a partial value", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(complexValuesSchema), notNullableAndNotOptional);

    const createdAtValue = new Date("2021-01-01T00:00:00.000Z");
    const result = transformTypeDescriptorToValue(tupleMap, {
      map: mapDescriptorFactory({
        name: stringDescriptorFactory("test_value"),
        age: numberDescriptorFactory(999),
        created_at: dateDescriptorFactory(createdAtValue),
      }),
      list_maps: listDescriptorFactory([
        mapDescriptorFactory({
          age: numberDescriptorFactory(999),
          is_active: booleanDescriptorFactory(false),
          created_at: dateDescriptorFactory(createdAtValue),
        }),
      ])
    });

    expect(result).toStrictEqual({
      map: {
        name: "test_value",
        age: 999,
        created_at: createdAtValue,
      },
      list_maps: [
        {
          age: 999,
          is_active: false,
          created_at: createdAtValue,
        },
      ],
    });
  });
});

describe("optional fields", () => {
  // Might be implemented in the future
});

describe("nullable fields", () => {
  // Might be implemented in the future
});
