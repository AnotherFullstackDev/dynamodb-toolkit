import { TupleKeyValuePeer, IndexAttributeValueTypes, PartitionKey, SortKey } from "./query";

export type TypedTupleMapBuilderCompletedResult<T = unknown> = { state: "completed"; value: T };

export type TupleMapBuilderUnknownInterface = { state: "unknown" };

export type NotTypedTupleMapBuilder<T extends TupleKeyValuePeer<string, unknown>[] = []> = {
  add<K extends string, V>(key: K, value: V): NotTypedTupleMapBuilder<[...T, TupleKeyValuePeer<K, V>]>;
};

export type TypedTupleMapBuilder<
  R extends Record<string, unknown> = Record<string, unknown>,
  T extends TupleKeyValuePeer<string, unknown>[] = [],
> = {
  add<K extends keyof R, V extends R[K]>(
    key: K,
    value: V,
  ): keyof Omit<R, K> extends never
    ? TypedTupleMapBuilderCompletedResult<[...T, TupleKeyValuePeer<K & string, V>]>
    : TypedTupleMapBuilder<Omit<R, K>, [...T, TupleKeyValuePeer<K & string, V>]>;
};

export type TupleMapBuilder<
  R extends Record<string, unknown> = Record<string, unknown>,
  T extends TupleKeyValuePeer<string, unknown>[] = [],
> = R extends TupleMapBuilderUnknownInterface ? NotTypedTupleMapBuilder<T> : TypedTupleMapBuilder<R, T>;

export type InferTupledMap<T> = T extends TypedTupleMapBuilder<infer I, infer TV>
  ? TV
  : T extends NotTypedTupleMapBuilder<infer UV>
  ? UV
  : T extends TypedTupleMapBuilderCompletedResult<infer M>
  ? M
  : never;

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

export const partitionKey = <V extends IndexAttributeValueTypes>(value: V): PartitionKey<V> => ({
  attributeType: "PARTITION_KEY",
  dataType: value,
});

export const sortKey = <V extends IndexAttributeValueTypes>(value: V): SortKey<V> => ({
  attributeType: "SORT_KEY",
  dataType: value,
});

export const schemaType = <V extends TupleMapBuilder<any, any> | TypedTupleMapBuilderCompletedResult>(
  value: V,
): InferTupledMap<V> => value as any;

const b = null as unknown as TupleMapBuilder<{ pk: number }>;
const c: TypedTupleMapBuilderCompletedResult = b.add("pk", numberType());
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

const sb = createSchemaBuilder();
const sbs = sb.add("pk", numberType()).add("sk", numberType()).add("age", numberType());
const sbm = createModel("schema_builder_model", sbs);

const tsb = createSchemaBuilder<{ pk: number; sk: number; age: number }>();
const tsbm = createModel(
  "schema_builder_model",
  tsb.add("pk", numberType()).add("sk", numberType()).add("age", numberType()),
);
const tsbm2 = createModel("schema_builder_model", tsb);

const ctb = {} as CompositeTypeBuilder;
const ctbv = ctb.literal("users#").string().literal("#").number().literal("#").boolean();

type CompositeType = InferCompositeType<typeof ctbv>;
type CompositeSortKey = CompositeValue<CompositeType>;

const tmb = {} as TupleMapBuilder;
const tmbv = tmb
  .add("pk", partitionKey(compositeType((builder) => builder.literal("users#").string())))
  .add("sk", sortKey(10));
type Tmbv = InferTupledMap<typeof tmbv>;
const schemaT = schemaType(tmbv);

const parentSchema = {} as TupleMapBuilder;
const childSchema = {} as TupleMapBuilder;
const parentSchemaType = schemaType(
  parentSchema.add(
    "child",
    schemaType(
      childSchema.add("pk", numberType()).add("sk", numberType()).add("gsi1", numberType()),
      // .add("gsi2", numberType())
      // .add("gsi3", numberType()),
    ),
  ),
);
