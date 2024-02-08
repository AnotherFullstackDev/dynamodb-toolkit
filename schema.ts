import {
  TupleKeyValuePeer,
  IndexAttributeValueTypes,
  PartitionKey,
  SortKey,
  ListAttribute,
  MapAttribute,
  SetAttribute,
  SetAttributeValueTypes,
  Attribute,
} from "./query";

export type TransformTypeToBuilderInterface<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? MapAttribute<TupleMapBuilderOriginalInterface<TransformTypeToBuilderInterface<T[K]>>>
    : T[K] extends Array<infer LV>
    ? // it will not handle list in list case
      ListAttribute<
        LV extends Record<string, unknown>
          ? MapAttribute<TupleMapBuilderOriginalInterface<TransformTypeToBuilderInterface<LV>>>
          : TransformTypeToBuilderInterface<LV>
      >
    : T[K];
};

type TupleMapBuilderOriginalInterface<T> = { interface: T };

export type TupleMapBuilderResult<I = unknown, T = unknown> = TupleMapBuilderOriginalInterface<I> & {
  state: "completed";
  value: T;
};

// @TODO: remove redundant types if everything goes sucessfully
export type TypedTupleMapBuilderCompletedResult<I = unknown, T = unknown> = TupleMapBuilderResult<I, T>;
// export type TypedTupleMapBuilderCompletedResult<I = unknown, T = unknown> = TupleMapBuilderOriginalInterface<I> & {
//   state: "completed";
//   value: T;
//   //   interface: I;
// };

export type NotTypedTupleMapBuilderCompleteResult<I = unknown, T = unknown> = TupleMapBuilderResult<I, T>;
// export type NotTypedTupleMapBuilderCompleteResult<I = unknown, T = unknown> = TupleMapBuilderOriginalInterface<I> & {
//   state: "completed";
//   value: T;
// };

export type TupleMapBuilderUnknownInterface = { state: "unknown" };

// Without the check the for TupleKeyValuePeer the type will unproperly extract types from MapType with dirrect result without a wrapper of TupleMapBuilderResult
export type ExtractAttributeValueType<V> = V extends TupleMapBuilderResult<infer I, infer S>
  ? S
  : V extends TupleKeyValuePeer<any, unknown>
  ? V
  : V extends Array<infer LT>
  ? LT extends TupleKeyValuePeer<any, unknown>
    ? V
    : ExtractAttributeValueType<LT>
  : V;

export type ExtractTupleMapBuilderResultFromSingleValue<T> = T extends Attribute<infer A, infer V>
  ? Attribute<
      A,
      ExtractTupleMapBuilderResultFromSingleValue<
        // V extends TupleMapBuilderResult<infer I, infer S> ? S : V extends Array<infer LT> ? LT : V
        ExtractAttributeValueType<V>
      >
    >
  : T;

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

export type NotTypedTupleMapBuilder<
  I extends Record<string, unknown> = Record<string, unknown>,
  T extends TupleKeyValuePeer<string, unknown>[] = [],
> = {
  add<K extends string, V>(
    key: K,
    value: V,
  ): NotTypedTupleMapBuilder<
    I & Record<K, V>,
    // List attributes should work untill it is not permitted to set schemas inside lists
    // [...T, TupleKeyValuePeer<K, V extends MapAttribute<infer MV> ? MapAttribute<InferTupledMap<MV>> : V>]
    [...T, TupleKeyValuePeer<K, ExtractTupleMapBuilderResultFromSingleValue<V>>]
  >;

  build(): NotTypedTupleMapBuilderCompleteResult<I, T>;
};

export type TypedTupleMapBuilder<
  O extends Record<string, unknown> = Record<string, unknown>,
  I extends Record<string, unknown> = Record<string, unknown>,
  T extends TupleKeyValuePeer<string, unknown>[] = [],
> = {
  add<K extends keyof I, V extends I[K]>(
    key: K,
    value: V,
  ): TypedTupleMapBuilder<O, Omit<I, K>, [...T, TupleKeyValuePeer<K & string, V>]>;

  build(): TypedTupleMapBuilderCompletedResult<O, T>;
};

export type TupleMapBuilder<
  R extends Record<string, unknown> = Record<string, unknown>,
  T extends TupleKeyValuePeer<string, unknown>[] = [],
> = R extends TupleMapBuilderUnknownInterface ? NotTypedTupleMapBuilder<{}, T> : TypedTupleMapBuilder<R, R, T>;

export type InferTupledMap<T> = T extends TupleMapBuilderResult<infer I, infer T> ? T : never;
// export type InferTupledMap<T> = T extends TypedTupleMapBuilder<infer I, infer TV>
//   ? TV
//   : T extends NotTypedTupleMapBuilder<infer UV>
//   ? UV
//   : T extends TypedTupleMapBuilderCompletedResult<infer M>
//   ? M
//   : never;

export type CompositeValue<T> = T extends [infer FT, ...infer R]
  ? `${FT extends string | number | boolean | bigint | null | undefined ? FT : FT & string}${CompositeValue<R>}`
  : T extends []
  ? ""
  : never;

export type CompositeTypeBuilder<T extends any[] = []> = {
  literal: <V extends string>(value: V) => CompositeTypeBuilder<[...T, V]>;
  string: () => CompositeTypeBuilder<[...T, string]>;
  number: () => CompositeTypeBuilder<[...T, number]>;
  boolean: () => CompositeTypeBuilder<[...T, boolean]>;
};

export type InferCompositeType<T extends CompositeTypeBuilder<any>> = T extends CompositeTypeBuilder<infer R>
  ? R
  : never;

export const compositeType = <V extends (fn: CompositeTypeBuilder) => CompositeTypeBuilder>(
  fn: V,
): CompositeValue<InferCompositeType<ReturnType<V>>> => fn as any;

export const numberType = <V extends number>(): V => null as any;

export const dateType = <V extends Date>(): V => null as any;

// export const schemaType = <V extends TupleMapBuilder<any, any> | TypedTupleMapBuilderCompletedResult>(
export const schemaType = <V extends TupleMapBuilderResult>(value: V): ForEachMapValuePrependKey<InferTupledMap<V>> =>
  value as any;

export const partitionKey = <V extends IndexAttributeValueTypes>(value: V): PartitionKey<V> => ({
  attributeType: "PARTITION_KEY",
  dataType: value,
});

export const sortKey = <V extends IndexAttributeValueTypes>(value: V): SortKey<V> => ({
  attributeType: "SORT_KEY",
  dataType: value,
});

const b = null as unknown as TupleMapBuilder<{ pk: number; sk: string }>;
const c: TypedTupleMapBuilderCompletedResult<{ pk: number; sk: string }> = b.add("pk", numberType()).add("sk", "value");
const c0: TypedTupleMapBuilderCompletedResult<{ pk: number; sk: string; age: number }> = b
  .add("pk", numberType())
  .add("sk", "value");
const c2: TypedTupleMapBuilderCompletedResult = b;

export const createModel = <
  N extends string,
  //   V extends TupleKeyValuePeer<string, unknown>[],
  M extends TypedTupleMapBuilderCompletedResult | NotTypedTupleMapBuilder,
>(
  name: N,
  model: M,
): TupleKeyValuePeer<N, InferTupledMap<M>> => [name, model as any];

export const createSchemaBuilder = <
  I extends Record<string, unknown> = TupleMapBuilderUnknownInterface,
>(): TupleMapBuilder<I> => ({} as any);

const umb = {} as TupleMapBuilder<{ pk: number; sk: number; age: number }>;
const um = createModel("some_model", umb.add("pk", numberType()).add("sk", numberType()));
// type Um = InferTupledMap<typeof um>;

export const listAttribute = <V>(value: V): ListAttribute<V> => value as any;

export const mapAttribute = <V extends TupleMapBuilderResult>(value: V): MapAttribute<V> => value as any;

export const setAttribute = <V extends SetAttributeValueTypes>(value: V): SetAttribute<V> => value as any;

const t = createSchemaBuilder()
  .add("list", listAttribute(numberType()))
  .add("map", mapAttribute(createSchemaBuilder().add("field", numberType()).build()))
  .add("set", numberType());

const t2 = createSchemaBuilder()
  .add("nestedList", listAttribute(mapAttribute(createSchemaBuilder().add("field", numberType()).build())))
  .build();
type t2st = InferTupledMap<typeof t2>;

// type PrependKeyToField<T, K> = T extends [infer FK, infer FV]
//   ? FV extends object
//     ? ForEachMapValuePrependKey<FV, `${K & string}.${FK & string}`>
//     : [`${K & string}.${FK & string}`, FV]
//   : never;

// type P = PrependKeyToField<["field1", number], "map">;
// type P1 = PrependKeyToField<["field1", ["field2", number]], "map">;

// @TODO: check for duplicates
type InferAttributeValue<T> = T extends Attribute<infer K, infer MV> ? MV : T;

export type ConcatenateKeys<K extends unknown[], D extends string = "."> = K extends [infer F, ...infer R]
  ? F extends ""
    ? ConcatenateKeys<R, D>
    : R extends []
    ? `${F & string}`
    : `${F & string}${D}${ConcatenateKeys<R, D>}`
  : K extends []
  ? ""
  : never;

export type ForEachMapValuePrependKey<T, K extends string = ""> = T extends [infer F, ...infer R]
  ? //   ? [PrependKeyToField<F, K>, ...ForEachMapValuePrependKey<R, K>]
    F extends [infer FK, infer FV]
    ? [
        ...(FV extends Attribute<"MAP", [...TupleKeyValuePeer<string, unknown>[]]>
          ? ForEachMapValuePrependKey<InferAttributeValue<FV>, ConcatenateKeys<[K, FK]>>
          : FV extends Attribute<"LIST", infer LT>
          ? ForEachMapValuePrependKey<[[`[${number}]`, LT]], ConcatenateKeys<[K, FK]>>
          : [[ConcatenateKeys<[K, FK]>, FV]]),
        ...ForEachMapValuePrependKey<R, K>,
      ]
    : F
  : T;

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

// type TransformComplexTypeToLeafPathTuple<T> = T extends [infer F, ...infer R]
//   ? F extends [infer K, infer V]
//     ? V extends MapAttribute<infer MV>
//       ? [
//           MV extends [infer MK, infer MVV] ? `${K & string}.${MK & string}` : never,
//           //   [K, MapAttribute<InferTupledMap<MV>>],
//           //   TransformComplexTypeToLeafPathTuple<InferTupledMap<MV>> extends [infer TK, infer TV]
//           //     ? [`${K & string}.${TK & string}`, TV]
//           //     : never,
//         ]
//       : [K, V]
//     : never
//   : never;
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

type T = TransformTypeToBuilderInterface<{
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
}>;
const t0: T = {
  name: "string",
  address: mapAttribute(
    createSchemaBuilder<
      TransformTypeToBuilderInterface<{
        zip: number;
        building: {
          number: number;
          additionalInfo: {
            comment: number;
          };
        };
      }>
    >()
      .add("zip", numberType())
      .add(
        "building",
        mapAttribute(
          createSchemaBuilder<
            TransformTypeToBuilderInterface<{
              number: number;
              additionalInfo: {
                comment: number;
              };
            }>
          >()
            .add("number", numberType())
            .add(
              "additionalInfo",
              mapAttribute(createSchemaBuilder<{ comment: number }>().add("comment", numberType()).build()),
            )
            .build(),
        ),
      )
      .build(),
  ),
  cards: listAttribute(mapAttribute(createSchemaBuilder<{ last4: string }>().add("last4", "string").build())),
};
const t1: TypedTupleMapBuilderCompletedResult = createSchemaBuilder<T>()
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

type T3 = TransformTypeToBuilderInterface<{ nestedList: { value: number }[] }>;
const t3s = createSchemaBuilder().add("value", numberType()).build();
const t3: T3 = {
  nestedList: listAttribute(mapAttribute(t3s)),
};
createSchemaBuilder<T3>().add(
  "nestedList",
  listAttribute(mapAttribute(createSchemaBuilder().add("value", numberType()).build())),
);
//  createSchemaBuilder().add(
//   "nestedList",
//   listAttribute(mapAttribute(t3s)),
//   //   listAttribute(mapAttribute(createSchemaBuilder().add("value2", numberType()))),
// );

type T4 = TransformTypeToBuilderInterface<{ nestedList: { value: number } }>;
const t4: T4 = createSchemaBuilder().add("nestedList", mapAttribute(t3s)).build();

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
