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

export type TransformTypeToSchemaBuilderInterface<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? MapAttribute<TupleMapBuilderOriginalInterface<TransformTypeToSchemaBuilderInterface<T[K]>>>
    : T[K] extends Array<infer LV>
    ? // it will not handle list in list case
      ListAttribute<
        LV extends Record<string, unknown>
          ? MapAttribute<TupleMapBuilderOriginalInterface<TransformTypeToSchemaBuilderInterface<LV>>>
          : TransformTypeToSchemaBuilderInterface<LV>
      >
    : T[K] | Attribute<unknown, T[K]>;
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
  ? Attribute<A, ExtractTupleMapBuilderResultFromSingleValue<ExtractAttributeValueType<V>>>
  : T;

export type NotTypedTupleMapBuilder<
  I extends Record<string, unknown> = Record<string, unknown>,
  T extends TupleKeyValuePeer<string, unknown>[] = [],
> = {
  add<K extends string, V>(
    key: K,
    value: V,
  ): NotTypedTupleMapBuilder<
    I & Record<K, V>,
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
  ): TypedTupleMapBuilder<
    O,
    Omit<I, K>,
    [...T, TupleKeyValuePeer<K & string, ExtractTupleMapBuilderResultFromSingleValue<V>>]
  >;

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

export const createModel = <N extends string, M extends TupleMapBuilderResult>(
  name: N,
  model: M,
): TupleKeyValuePeer<N, InferTupledMap<M>> => [name, model as any];

export const createSchemaBuilder = <I extends Record<string, unknown> = TupleMapBuilderUnknownInterface>(): TupleMapBuilder<
  I extends TupleMapBuilderUnknownInterface ? I : TransformTypeToSchemaBuilderInterface<I>
> => ({} as any);

export const listAttribute = <V>(value: V): ListAttribute<V> => value as any;

export const mapAttribute = <V extends TupleMapBuilderResult>(value: V): MapAttribute<V> => value as any;

export const setAttribute = <V extends SetAttributeValueTypes>(value: V): SetAttribute<V> => value as any;

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
  ? F extends [infer FK, infer FV]
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
