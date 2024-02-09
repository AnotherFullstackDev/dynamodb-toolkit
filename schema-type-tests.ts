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
  composite,
  createModel,
  schemaBuilder,
  list,
  map,
  number,
  partitionKey,
  useSchema,
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
  address: map(
    schemaBuilder<{
      zip: number;
      building: {
        number: number;
        additionalInfo: {
          comment: number;
        };
      };
    }>()
      .add("zip", number())
      .add(
        "building",
        map(
          schemaBuilder<{
            number: number;
            additionalInfo: {
              comment: number;
            };
          }>()
            .add("number", number())
            .add("additionalInfo", map(schemaBuilder().add("comment", number()).build()))
            .build(),
        ),
      )
      .build(),
  ),
  cards: list(map(schemaBuilder<{ last4: string }>().add("last4", "string").build())),
};
const t1 = schemaBuilder<T>()
  .add("name", "value")
  .add(
    "address",
    map(
      schemaBuilder()
        .add("zip", number())
        .add(
          "building",
          map(
            schemaBuilder()
              .add("number", number())
              .add("additionalInfo", map(schemaBuilder().add("comment", number()).build()))
              .build(),
          ),
        )
        .build(),
    ),
  )
  .add("cards", list(map(schemaBuilder().add("last4", "string").build())))
  .build();

type T3 = { nestedList: { value: number }[] };
const t3s = schemaBuilder<{ value: number }>().add("value", number()).build();
const t3 = schemaBuilder<T3>()
  .add("nestedList", list(map(t3s)))
  .build();

schemaBuilder<T3>().add("nestedList", list(map(schemaBuilder().add("value", number()).build())));

type T4 = { nestedList: { value: number } };
const t4 = schemaBuilder<T3>().add("nestedList", map(t3s)).build();

const sb = schemaBuilder();
const sbs = sb.add("pk", number()).add("sk", number()).add("age", number()).build();
const sbm = createModel("schema_builder_model", sbs);

const tsb = schemaBuilder<{ pk: number; sk: number; age: number }>();
const tsbm = createModel(
  "schema_builder_model",
  tsb.add("pk", number()).add("sk", number()).add("age", number()).build(),
);
const tsbm2 = createModel("schema_builder_model", tsb);

const ctb = {} as CompositeTypeBuilder;
const ctbv = ctb.literal("users#").string().literal("#").number().literal("#").boolean();

type CompositeType = InferCompositeType<typeof ctbv>;
type CompositeSortKey = CompositeValue<CompositeType>;

const tmb = {} as TupleMapBuilder;
const tmbv = tmb
  .add("pk", partitionKey(composite((builder) => builder.literal("users#").string())))
  .add("sk", sortKey(10))
  .build();
type Tmbv = InferTupledMap<typeof tmbv>;
const schemaT = useSchema(tmbv);

const parentSchema = {} as TupleMapBuilder;
const childSchema = {} as TupleMapBuilder;
const parentSchemaType = useSchema(
  parentSchema
    .add(
      "child",
      useSchema(
        childSchema.add("pk", number()).add("sk", number()).add("gsi1", number()).build(),
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
const s1 = schemaBuilder()
  .add("pk", partitionKey(number()))
  //   .add("sk", sortKey(numberType()))
  //   .add("number", numberType())
  .add(
    "map",
    map(
      schemaBuilder()
        .add("field", number())
        .add("nestedMap", map(schemaBuilder().add("field2", number()).build()))
        .build(),
    ),
  )
  .add("list", list(map(schemaBuilder().add("field", number()).build())))
  .build();
type S1T = InferTupledMap<typeof s1>;
// type S1T1 = TransformComplexTypeToLeafPathTuple<S1T>;
type S1T2 = ForEachMapValuePrependKey<S1T>;
