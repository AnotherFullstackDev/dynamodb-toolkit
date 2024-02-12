import { Attribute, IndexAttributeValueTypes, ListAttribute, MapAttribute, PartitionKey, SortKey } from "../attribute";
import { ConcatenateArrays } from "../utility-types";

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

type ETT = ExtractTupleMapBuilderResultFromSingleValue<Attribute<"REGULAR", number>>;

export type ExtractOriginalTypeFromSingleValue<T> = T extends Attribute<infer A, infer V>
  ? ExtractOriginalTypeFromSingleValue<
      // Seems that even if the tupleMapBuilderResult uses another type under the hood we still need to check for that type.
      // Probably it is so because we create a new type inside with intersection operator
      V extends TupleMapBuilderResult<infer RI> ? RI : V extends TupleMapBuilderOriginalInterface<infer OI> ? OI : V
    > extends infer ET
    ? A extends "LIST"
      ? Array<ET>
      : ET
    : never
  : T;

/**
 * A small "hack" to get types combined via intersection into one interface.
 * The goas in to improve readability of the final interface
 *
 * @example
 * ```typescript
 * type SeveralInterfaces = {one: string} & {two: number};
 * type Final = ReconstructInterfaces<SeveralInterfaces>; // => {one: string; two: number}
 * ```
 */
// @TODO: renave to reflect its goal
export type ReconstructInterfaces<T> = T extends object
  ? {
      [K in keyof T]: ExtractOriginalTypeFromSingleValue<T[K]> extends infer ET
        ? ET extends object
          ? ET extends Date
            ? ET
            : ReconstructInterfaces<ET>
          : ET
        : never;
    }
  : T;

// TODO: map builders should be uniform
// TODO: map builders should always accept attribute as a value (currently, untill we have a wrapper for a data type)
export type NotTypedTupleMapBuilder<
  I extends Record<string, unknown> = Record<string, unknown>,
  T extends TupleKeyValuePeer<string, unknown>[] = [],
> = {
  add<K extends string, V>(
    key: K,
    value: V,
  ): NotTypedTupleMapBuilder<
    I & Record<K, V>,
    // ReconstructInterfaces<I & Record<K, ExtractOriginalTypeFromSingleValue<V>>>,
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
export type InferTupleMapInterface<T> = T extends TupleMapBuilderOriginalInterface<infer I> ? I : never;

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
        [ConcatenateKeys<[K, FK]>, FV],

        ...(FV extends Attribute<"MAP", [...TupleKeyValuePeer<string, unknown>[]]>
          ? ForEachMapValuePrependKey<InferAttributeValue<FV>, ConcatenateKeys<[K, FK]>>
          : FV extends Attribute<"LIST", infer LT>
          ? ForEachMapValuePrependKey<[[`[${number}]`, LT]], ConcatenateKeys<[K, FK]>>
          : []),
        // : [[ConcatenateKeys<[K, FK]>, FV]]),

        ...ForEachMapValuePrependKey<R, K>,
      ]
    : F
  : T;

export type TransformTableSchemaIntoSchemaInterfacesMap<T> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? [[K, ReconstructInterfaces<InferTupleMapInterface<S>>], ...TransformTableSchemaIntoSchemaInterfacesMap<R>]
    : never
  : T;

export type TransformTableSchemaIntoTupleSchemasMap<T> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? [[K, ForEachMapValuePrependKey<InferTupledMap<S>>], ...TransformTableSchemaIntoTupleSchemasMap<R>]
    : never
  : T;

export type FilterTupleSchemasByType<T, P> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer V]
    ? MatchesAnyOfTypes<V, P> extends true
      ? [F, ...FilterTupleSchemasByType<R, P>]
      : FilterTupleSchemasByType<R, P>
    : never
  : T;

export type FilterTableSchemaFieldsByType<T, P> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? FilterTupleSchemasByType<S, P> extends infer FR
      ? FR extends []
        ? FilterTableSchemaFieldsByType<R, P>
        : [[K, FR], ...FilterTableSchemaFieldsByType<R, P>]
      : never
    : never
  : T;

export type MatchesAnyOfTypes<T, P> = P extends [infer F, ...infer R]
  ? T extends F
    ? true
    : MatchesAnyOfTypes<T, R>
  : false;

export type RemoveTupleSchemasByType<T, P> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer V]
    ? MatchesAnyOfTypes<V, P> extends true
      ? RemoveTupleSchemasByType<R, P>
      : [F, ...RemoveTupleSchemasByType<R, P>]
    : never
  : T;

export type RemoveTableSchemaFieldsByType<T, P> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? RemoveTupleSchemasByType<S, P> extends infer FR
      ? FR extends []
        ? RemoveTableSchemaFieldsByType<R, P>
        : [[K, FR], ...RemoveTableSchemaFieldsByType<R, P>]
      : never
    : never
  : T;

type TR = RemoveTupleSchemasByType<
  [["pk", PartitionKey<string>], ["sk", SortKey<number>], ["name", string], ["age", number]],
  [PartitionKey<any>, SortKey<any>]
>;
type TR2 = RemoveTableSchemaFieldsByType<
  [["users", [["pk", PartitionKey<string>], ["sk", SortKey<number>], ["name", string], ["age", number]]]],
  [PartitionKey<any>, SortKey<any>]
>;

export type ExtractKeysFromTupleSchemas<T> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer V]
    ? [K, ...ExtractKeysFromTupleSchemas<R>]
    : never
  : T;

export type ExtractEntityKeysFromTableSchema<S> = S extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? ConcatenateArrays<ExtractKeysFromTupleSchemas<S>, ExtractEntityKeysFromTableSchema<R>>
    : F
  : S;

export type PickOnlyPrimaryKeyAttributesFromTupledFieldSchemasList<T> = T extends [infer AttributeTuple, ...infer R]
  ? TupleValue<AttributeTuple> extends PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
    ? [
        [TupleKey<AttributeTuple>, TupleValue<AttributeTuple>],
        ...PickOnlyPrimaryKeyAttributesFromTupledFieldSchemasList<R>,
      ]
    : PickOnlyPrimaryKeyAttributesFromTupledFieldSchemasList<R>
  : T;

export type PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<T> = T extends [infer Model, ...infer R]
  ? Model extends [infer K, infer L]
    ? [
        [K, PickOnlyPrimaryKeyAttributesFromTupledFieldSchemasList<L>],
        ...PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<R>,
      ]
    : never
  : T;

export type PickOnlyNonPrimaryKeyAttributesFromTupledFieldSchemaList<T> = T extends [infer AttributeTuple, ...infer R]
  ? TupleValue<AttributeTuple> extends PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
    ? PickOnlyNonPrimaryKeyAttributesFromTupledFieldSchemaList<R>
    : [
        [TupleKey<AttributeTuple>, TupleValue<AttributeTuple>],
        ...PickOnlyNonPrimaryKeyAttributesFromTupledFieldSchemaList<R>,
      ]
  : T;

export type PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<T> = T extends [infer Model, ...infer R]
  ? Model extends [infer K, infer L]
    ? [
        [K, PickOnlyNonPrimaryKeyAttributesFromTupledFieldSchemaList<L>],
        ...PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<R>,
      ]
    : never
  : T;

export type TupleKeyValuePeer<T extends string | number | symbol, V> = [T, V];

export type TupleKeys<T> = T extends [infer FT, ...infer R]
  ? FT extends [infer K, infer V]
    ? K | TupleKeys<R>
    : never
  : never;

export type TupleKey<T> = T extends [infer K, infer V] ? K : never;

export type TupleValue<T> = T extends [infer K, infer V] ? V : never;

export type TupleValues<T> = T extends [infer FT, ...infer R]
  ? FT extends [infer K, infer V]
    ? V | TupleValues<R>
    : never
  : never;

export type TupleValueByKey<T, K> = T extends [infer FT, ...infer R]
  ? FT extends [K, infer V]
    ? V
    : TupleValueByKey<R, K>
  : never;

export type TupleKeyedEntitySchema = TupleKeyValuePeer<
  string,
  [TupleKeyValuePeer<string, unknown>, ...TupleKeyValuePeer<string, unknown>[]]
>;

export type TupledTableSchema = [TupleKeyedEntitySchema, ...TupleKeyedEntitySchema[]];
