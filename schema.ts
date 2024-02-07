import { TupleKeyValuePeer, IndexAttributeValueTypes, PartitionKey, SortKey } from "./query";

export type TupleMapBuilder<T extends TupleKeyValuePeer<string, unknown>[] = []> = {
  add<K extends string, V>(key: K, value: V): TupleMapBuilder<[...T, TupleKeyValuePeer<K, V>]>;
};

export type InferTupledMap<T extends TupleMapBuilder<any>> = T extends TupleMapBuilder<infer R> ? R : never;

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

export const schemaType = <V extends TupleMapBuilder>(value: V): InferTupledMap<V> => value as any;

const ctb = {} as CompositeTypeBuilder;
const ctbv = ctb.literal("users#").string().literal("#").number().literal("#").boolean();

type CompositeType = InferCompositeType<typeof ctbv>;
type CompositeSortKey = CompositeValue<CompositeType>;

const tmb = {} as TupleMapBuilder;
const tmbv = tmb
  .add("pk", partitionKey(compositeType((builder) => builder.literal("users#").string())))
  .add("sk", sortKey(10));
type Tmbv = InferTupledMap<typeof tmbv>;
