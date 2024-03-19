import {
  ApplyNullability,
  ApplyOptional,
  Attribute,
  AttributeType,
  CloneAttributeWithNewValue,
  InferOptionalValue,
  ListAttribute,
  MapAttribute,
  Optional,
  OptionalValue,
  PartitionKey,
  SortKey,
} from "../attribute/attribute";
import { ConcatenateArrays, ContainsNull, ContainsUndefined, OmitByValue, PickByValue } from "../utility-types";

// type UnitedWithNull<T> = T | null | undefined;
// type TestNullable = string | null | undefined;
// type IsString = TestNullable extends string ? true : false;
// type IsNullable = TestNullable extends null ? true : false;
// type IsCombined = TestNullable extends UnitedWithNull<string> ? true : false;
// type ContainsNull = null extends TestNullable ? true : false;
// type ContainsUndefined = undefined extends TestNullable ? true : false;

// @TODO: might have problems with list of scalar values
export type TransformTypeToSchemaBuilderInterface<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? MapAttribute<TupleMapBuilderOriginalInterface<TransformTypeToSchemaBuilderInterface<T[K]>>>
    : T[K] extends Array<infer LV>
    ? // it will not handle list in list case
      ListAttribute<
        LV extends Record<string, unknown>
          ? MapAttribute<TupleMapBuilderOriginalInterface<TransformTypeToSchemaBuilderInterface<LV>>>
          : Attribute<AttributeType, TransformTypeToSchemaBuilderInterface<LV>>
      >
    : // : T[K] | Attribute<unknown, T[K]>;
      Attribute<AttributeType, T[K] | Attribute<AttributeType, T[K]>, ContainsNull<T[K]>, ContainsUndefined<T[K]>>;
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
  ? CloneAttributeWithNewValue<T, ExtractTupleMapBuilderResultFromSingleValue<ExtractAttributeValueType<V>>> // Attribute<A, ExtractTupleMapBuilderResultFromSingleValue<ExtractAttributeValueType<V>>>
  : T;

type ETT = ExtractTupleMapBuilderResultFromSingleValue<Attribute<"REGULAR", number>>;

export type ExtractOriginalTypeFromSingleValue<T> = T extends Attribute<infer A, infer V>
  ? ExtractOriginalTypeFromSingleValue<
      // Seems that even if the tupleMapBuilderResult uses another type under the hood we still need to check for that type.
      // Probably it is so because we create a new type inside with intersection operator
      V extends TupleMapBuilderResult<infer RI> ? RI : V extends TupleMapBuilderOriginalInterface<infer OI> ? OI : V
    > extends infer ET
    ? A extends "LIST"
      ? ApplyOptional<T, ApplyNullability<T, Array<ET>>>
      : ApplyOptional<T, ApplyNullability<T, ET>>
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

// DO NOT USE such utility types as they may not return the exact type but rather the parent supertype like boolean instead of true | false
// type IsRecordType<T> = T extends object ? true : false;

// type TurnOptionalFieldsToPartialForSingleValue<T> = OmitByValue<T, Optional<true>> &
//   Partial<PickByValue<T, Optional<true>>>;
type TurnOptionalFieldsToPartialForSingleValue<T> = RemapType<
  OmitByValue<T, Optional<true>> & Partial<PickByValue<T, Optional<true>>>
>;

// type TurnOptionalFieldsToPartialOrDoNothing<T> = IsRecordType<T> extends true
//   ? RemapType<InferOptionalValueForObjectFields<TurnOptionalFieldsToPartialForSingleValue<T>>>
//   : T;
type TurnOptionalFieldsToPartialOrDoNothing<T> = T extends Record<string, unknown>
  ? T extends OptionalValue<infer OV>
    ? OptionalValue<TurnOptionalFieldsToPartial<OV>>
    : RemapType<InferOptionalValueForObjectFields<TurnOptionalFieldsToPartialForSingleValue<T>>>
  : T;

// TODO: the conversion functionality might be rewritten to rely on undefined as a merker of optionality instead of OptionalValue<T>
export type TurnOptionalFieldsToPartial<T> = T extends Record<string, unknown>
  ? // ? TurnOptionalFieldsToPartialOrDoNothing<{
    {
      // [K in keyof T]: TurnOptionalFieldsToPartial<TurnOptionalFieldsToPartialOrDoNothing<T[K]>>;

      [K in keyof T]: TurnOptionalFieldsToPartialOrDoNothing<T[K]> extends infer R
        ? TurnOptionalFieldsToPartial<R>
        : never;

      // [K in keyof T]: TurnOptionalFieldsToPartialOrDoNothing<T[K]> extends infer R
      //   ? R extends object
      //     ? TurnOptionalFieldsToPartial<R>
      //     : R
      //   : never;

      // [K in keyof T]: T[K] extends OptionalValue<infer OV>
      //   ? OptionalValue<TurnOptionalFieldsToPartial<OV>>
      //   : TurnOptionalFieldsToPartial<TurnOptionalFieldsToPartialOrDoNothing<T[K]>>;
    } extends infer M
    ? TurnOptionalFieldsToPartialOrDoNothing<M>
    : never
  : // }>
  // : T;
  T extends Array<infer AV>
  ? AV extends OptionalValue<infer OV>
    ? OptionalValue<Array<TurnOptionalFieldsToPartial<OV>>>
    : Array<TurnOptionalFieldsToPartial<AV>>
  : T;

type RemapType<T> = T extends Record<string, unknown> ? { [K in keyof T]: T[K] } : T;

type InferOptionalValueForObjectFields<T> = { [K in keyof T]: InferOptionalValue<T[K]> };

type OSF = TurnOptionalFieldsToPartialOrDoNothing<{
  // a: string;
  b: OptionalValue<string>;
  c: OptionalValue<{
    a: string;
    b: OptionalValue<string>;
  }>;
}>;

type OptionalValuesTestPlain = TurnOptionalFieldsToPartial<{
  a: string;
  b: OptionalValue<string>;
  c: OptionalValue<{
    a: OptionalValue<string>;
    // b: OptionalValue<string>;
  }>;
  d: number[];
  j: OptionalValue<number>[];
  i: OptionalValue<number[]>;
  f: OptionalValue<{ a: number }[]>;
  k: OptionalValue<{ a: number }>[];
  m: OptionalValue<{ a: OptionalValue<number>[] }>[];
}>;

type HalfOptionalValuesTestDeepNesting = TurnOptionalFieldsToPartial<{
  a: {
    a: OptionalValue<{
      a: OptionalValue<{
        a: OptionalValue<{
          a: OptionalValue<string>;
          // b: number;
          b: OptionalValue<{
            a: number;
            c: Date;
            d: OptionalValue<Date>;
          }>;
        }>;
      }>;
    }>;
  };
}>;

type OneToOneOptionalValuesDeepNesting = TurnOptionalFieldsToPartial<{
  a: {
    a: OptionalValue<{
      a: {
        a: OptionalValue<{
          a: OptionalValue<string>;
        }>;
      };
    }>;
  };
}>;

type VariousTypesAtSameLevel = TurnOptionalFieldsToPartial<{
  a: string;
  b: OptionalValue<number>;
  c: OptionalValue<{
    a: string;
    b: OptionalValue<number>;
  }>;
  d: {
    a: Date;
    b: number;
    c: {
      a: OptionalValue<{ a: string }>;
    };
  };
  i: {
    a: boolean;
    b: OptionalValue<boolean>;
    c: OptionalValue<
      {
        a: boolean;
        b: OptionalValue<boolean>;
      }[]
    >;
  }[];
}>;

const asd: HalfOptionalValuesTestDeepNesting = {
  a: {
    a: {
      a: {
        a: {
          a: "10",
        },
      },
    },
  },
};

type TT = TurnOptionalFieldsToPartial<{
  // a: Attribute<AttributeType.DATE, Date, false, false>;
  // b: OptionalValue<Attribute<AttributeType.DATE, Date, false, true>>;
  a: string;
  b: OptionalValue<string>;
  c: OptionalValue<{
    b: OptionalValue<string>;
    c: OptionalValue<{
      b: OptionalValue<string>;
      j: OptionalValue<{
        a: string;
        b: OptionalValue<string>;
      }>;
    }>;
  }>[];
  // d: {
  //   a: {
  //     a: {
  //       a: OptionalValue<string>;
  //     };
  //   };
  // };
}>;

const t: TT = {
  c: [
    {
      c: {
        b: "s",
      },
    },
  ],
};

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
        [ConcatenateKeys<[K, FK]>, ApplyNullability<F, FV>],

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
    ? [
        [K, TurnOptionalFieldsToPartial<ReconstructInterfaces<InferTupleMapInterface<S>>>],
        ...TransformTableSchemaIntoSchemaInterfacesMap<R>,
      ]
    : never
  : T;

export type TransformTableSchemaIntoTupleSchemasMap<T> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? [[K, ForEachMapValuePrependKey<InferTupledMap<S>>], ...TransformTableSchemaIntoTupleSchemasMap<R>]
    : // [[K, InferTupledMap<S>], ...TransformTableSchemaIntoTupleSchemasMap<R>]
      never
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
  [
    ["pk", PartitionKey<Attribute<AttributeType.REGULAR, string>>],
    ["sk", SortKey<number>],
    ["name", string],
    ["age", number],
  ],
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
  ? // ? TupleValue<AttributeTuple> extends PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
    TupleValue<AttributeTuple> extends PartitionKey<any> | SortKey<any>
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
  ? // ? TupleValue<AttributeTuple> extends PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
    TupleValue<AttributeTuple> extends PartitionKey<any> | SortKey<any>
    ? PickOnlyNonPrimaryKeyAttributesFromTupledFieldSchemaList<R>
    : [
        // [TupleKey<AttributeTuple>, TupleValue<AttributeTuple>],
        AttributeTuple,
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
