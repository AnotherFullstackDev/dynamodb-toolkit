import { ListAttribute, MapAttribute, TupleKeyValuePeer } from "./query";
import {
  CompositeTypeBuilder,
  CompositeValue,
  ExtractTupleMapBuilderResultFromSingleValue,
  ForEachMapValuePrependKey,
  InferCompositeType,
  InferTupledMap,
  NotTypedTupleMapBuilderCompleteResult,
  TupleMapBuilder,
  TupleMapBuilderResult,
  compositeType,
  createModel,
  createSchemaBuilder,
  listAttribute,
  mapAttribute,
  numberType,
  partitionKey,
  schemaType,
  sortKey,
} from "./schema";

type ET = ExtractTupleMapBuilderResultFromSingleValue<
  MapAttribute<TupleMapBuilderResult<unknown, [["field", number]]>>
>;
type ET1 = ExtractTupleMapBuilderResultFromSingleValue<
  MapAttribute<MapAttribute<TupleMapBuilderResult<unknown, [["field", number]]>>>
>;
type ET2 = ExtractTupleMapBuilderResultFromSingleValue<
  MapAttribute<TupleMapBuilderResult<unknown, MapAttribute<TupleMapBuilderResult<unknown, [["field", number]]>>>>
>;
type ET3 = ExtractTupleMapBuilderResultFromSingleValue<
  ListAttribute<TupleMapBuilderResult<unknown, [["field1", number]]>>
>;
type ET4 = ExtractTupleMapBuilderResultFromSingleValue<
  ListAttribute<TupleMapBuilderResult<unknown, MapAttribute<[TupleKeyValuePeer<"field1", number>]>>>
>;
type ET4_1 = ExtractTupleMapBuilderResultFromSingleValue<
  ListAttribute<TupleMapBuilderResult<unknown, MapAttribute<[["field1", number], ["field2", number]]>>>
>;
type ET5 = ExtractTupleMapBuilderResultFromSingleValue<
  ListAttribute<TupleMapBuilderResult<unknown, MapAttribute<TupleMapBuilderResult<unknown, [["field1", number]]>>>>
>;
type ET6 = ExtractTupleMapBuilderResultFromSingleValue<
  ListAttribute<
    MapAttribute<NotTypedTupleMapBuilderCompleteResult<Record<"field", number>, [TupleKeyValuePeer<"field", number>]>>
  >
>;

type T = {
  name: string;
  address: {
    zip: number;
    building: {
      number: number;
      additionalInfo: {
        comment: number;
      };
    };
  };
  cards: { last4: string }[];
};
const t0 = {
  name: "string",
  address: mapAttribute(
    createSchemaBuilder<{
      zip: number;
      building: {
        number: number;
        additionalInfo: {
          comment: number;
        };
      };
    }>()
      .add("zip", numberType())
      .add(
        "building",
        mapAttribute(
          createSchemaBuilder<{
            number: number;
            additionalInfo: {
              comment: number;
            };
          }>()
            .add("number", numberType())
            .add("additionalInfo", mapAttribute(createSchemaBuilder().add("comment", numberType()).build()))
            .build(),
        ),
      )
      .build(),
  ),
  cards: listAttribute(mapAttribute(createSchemaBuilder<{ last4: string }>().add("last4", "string").build())),
};
const t1 = createSchemaBuilder<T>()
  .add("name", "value")
  .add(
    "address",
    mapAttribute(
      createSchemaBuilder()
        .add("zip", numberType())
        .add(
          "building",
          mapAttribute(
            createSchemaBuilder()
              .add("number", numberType())
              .add("additionalInfo", mapAttribute(createSchemaBuilder().add("comment", numberType()).build()))
              .build(),
          ),
        )
        .build(),
    ),
  )
  .add("cards", listAttribute(mapAttribute(createSchemaBuilder().add("last4", "string").build())))
  .build();

type T3 = { nestedList: { value: number }[] };
const t3s = createSchemaBuilder<{ value: number }>().add("value", numberType()).build();
const t3 = createSchemaBuilder<T3>()
  .add("nestedList", listAttribute(mapAttribute(t3s)))
  .build();

createSchemaBuilder<T3>().add(
  "nestedList",
  listAttribute(mapAttribute(createSchemaBuilder().add("value", numberType()).build())),
);

type T4 = { nestedList: { value: number } };
const t4 = createSchemaBuilder<T3>().add("nestedList", mapAttribute(t3s)).build();

const sb = createSchemaBuilder();
const sbs = sb.add("pk", numberType()).add("sk", numberType()).add("age", numberType()).build();
const sbm = createModel("schema_builder_model", sbs);

const tsb = createSchemaBuilder<{ pk: number; sk: number; age: number }>();
const tsbm = createModel(
  "schema_builder_model",
  tsb.add("pk", numberType()).add("sk", numberType()).add("age", numberType()).build(),
);
const tsbm2 = createModel("schema_builder_model", tsb);

const ctb = {} as CompositeTypeBuilder;
const ctbv = ctb.literal("users#").string().literal("#").number().literal("#").boolean();

type CompositeType = InferCompositeType<typeof ctbv>;
type CompositeSortKey = CompositeValue<CompositeType>;

const tmb = {} as TupleMapBuilder;
const tmbv = tmb
  .add("pk", partitionKey(compositeType((builder) => builder.literal("users#").string())))
  .add("sk", sortKey(10))
  .build();
type Tmbv = InferTupledMap<typeof tmbv>;
const schemaT = schemaType(tmbv);

const parentSchema = {} as TupleMapBuilder;
const childSchema = {} as TupleMapBuilder;
const parentSchemaType = schemaType(
  parentSchema
    .add(
      "child",
      schemaType(
        childSchema.add("pk", numberType()).add("sk", numberType()).add("gsi1", numberType()).build(),
        // .add("gsi2", numberType())
        // .add("gsi3", numberType()),
      ),
    )
    .build(),
);

type F = ForEachMapValuePrependKey<
  // Booleans have a peculiarity that they create a union type with true and false variations
  [
    // ["field1", number],
    ["field2", string],
    ["field3", MapAttribute<[["nested_field1", string]]>],
    ["field4", ListAttribute<number>],
    ["field5", ListAttribute<MapAttribute<[["nested_field2", string]]>>],
    ["field6", MapAttribute<[["nested_field3", MapAttribute<[["nested_field4", string]]>]]>],
    // ["field7", MapAttribute<[["nested_field5", ListAttribute<MapAttribute<[["nested_field7", string]]>>]]>],
    [
      "field8",
      ListAttribute<MapAttribute<[["nested_field5", ListAttribute<MapAttribute<[["nested_field7", string]]>>]]>>,
    ],
  ]
>;

/**
 * Desired result:
 * - ["map", MapAttribute<{ field: number }>]
 * - ["map.field", number]
 */
const s1 = createSchemaBuilder()
  .add("pk", partitionKey(numberType()))
  //   .add("sk", sortKey(numberType()))
  //   .add("number", numberType())
  .add(
    "map",
    mapAttribute(
      createSchemaBuilder()
        .add("field", numberType())
        .add("nestedMap", mapAttribute(createSchemaBuilder().add("field2", numberType()).build()))
        .build(),
    ),
  )
  .add("list", listAttribute(mapAttribute(createSchemaBuilder().add("field", numberType()).build())))
  .build();
type S1T = InferTupledMap<typeof s1>;
// type S1T1 = TransformComplexTypeToLeafPathTuple<S1T>;
type S1T2 = ForEachMapValuePrependKey<S1T>;
