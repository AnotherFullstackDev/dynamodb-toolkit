// @TODO: solve attributes nulability question;

import { TupleMapBuilderResult } from "../schema/schema.types";
import { AttributeBuilder } from "./attribute.builder";
import { isAttributeType } from "./attribute.matchers";

export type Nullable<N> = { isNullable: N };

export type Optional<O> = { isOptional: O };

export type OptionalValue<T> = { isOptional: true; value: T };

export type InferOptionalValue<T> = T extends OptionalValue<infer V> ? V : T;

export type ResolveOptional<T> = T extends OptionalValue<infer V> ? V | undefined : T;

export type ApplyNullability<M, T> = M extends Nullable<true> ? T | null : T;

export type CloneAttributeWithNewValue<A, V> = A extends Attribute<infer T, unknown, infer N, infer O>
  ? Attribute<T, V, N, O>
  : A;

export type ApplyOptional<M, T> = M extends Optional<true> ? OptionalValue<T> : T;

// export type Attribute<A, T, N = unknown> = { attributeType: A; dataType: T; mayBeNull?: N };
export type Attribute<A, T, N = unknown, O = unknown> = { attributeType: A; dataType: T } & Nullable<N> & Optional<O>;

export const enum AttributeType {
  PARTITION_KEY = "PARTITION_KEY",
  SORT_KEY = "SORT_KEY",
  LIST = "LIST",
  MAP = "MAP",
  SET = "SET",
  REGULAR = "REGULAR",
  DATE = "DATE",
  BINARY = "BINARY",
}

export type IndexAttributeValueTypes = string | number | boolean;

export type PartitionKey<T extends IndexAttributeValueTypes | Attribute<AttributeType, IndexAttributeValueTypes>> =
  Attribute<AttributeType.PARTITION_KEY, T>;

export type SortKey<T extends IndexAttributeValueTypes | Attribute<AttributeType, IndexAttributeValueTypes>> =
  Attribute<AttributeType.SORT_KEY, T>;

export type ListAttributeValues = Attribute<AttributeType, unknown>;
// A tuple attribute can be created based on the list type
// export type ListAttribute<T> = Attribute<"LIST", T[]>;
export type ListAttribute<T extends ListAttributeValues> = Attribute<AttributeType.LIST, T>; // changing type from T[] to T to avoid problems with extracting Attribute value types

export type MapAttribute<T> = Attribute<AttributeType.MAP, T>;

export type SetAttributeValueTypes = string | number;

// Set attribute can contain string, number and binary types
// export type SetAttribute<T extends SetAttributeValueTypes> = Attribute<"SET", T[]>;
export type SetAttribute<T extends SetAttributeValueTypes> = Attribute<AttributeType.SET, T>; // changing type from T[] to T to avoid problems with extracting Attribute value types

export type RegularAttributeValueTypes = string | number | bigint | boolean;

export type RegularAttribute<V> = Attribute<AttributeType.REGULAR, V>;

export type DateAttribute<V> = Attribute<AttributeType.DATE, V>;

export type BinaryAttribute<V> = Attribute<AttributeType.BINARY, V>;

export type InferOriginalOrAttributeDataType<T> = T extends Attribute<unknown, infer U> ? U : T;

export const getDataType = <T>(value: T | Attribute<AttributeType, T>): T =>
  isAttributeType(value) ? value.dataType as T : value as T;

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

export const composite = <V extends (fn: CompositeTypeBuilder) => CompositeTypeBuilder>(
  fn: V,
): CompositeValue<InferCompositeType<ReturnType<V>>> => fn as any;

// @TODO: type safety of the builder should be improved by adding a sepcific wrapped for data types to prevent passing literal values

// export const string = <V extends string>(): RegularAttribute<V> =>
export const string = <V extends string>() =>
  new AttributeBuilder(AttributeType.REGULAR, String as unknown as V, false, false);

export const number = <V extends number>() =>
  new AttributeBuilder(AttributeType.REGULAR, Number as unknown as V, false, false);

export const bool = <V extends boolean>() =>
  new AttributeBuilder(AttributeType.REGULAR, Boolean as unknown as V, false, false);

export const date = <V extends Date>() => new AttributeBuilder(AttributeType.DATE, Date as unknown as V, false, false);

// @TODO: binary data type requires additional work
export const binary = <V extends ArrayBufferLike>() =>
  new AttributeBuilder(AttributeType.BINARY, ArrayBuffer as unknown as V, false, false);

export const partitionKey = <V extends IndexAttributeValueTypes | Attribute<AttributeType, IndexAttributeValueTypes>>(
  value: V,
) => new AttributeBuilder(AttributeType.PARTITION_KEY, value, false, false);

export const sortKey = <V extends IndexAttributeValueTypes | Attribute<AttributeType, IndexAttributeValueTypes>>(
  value: V,
) => new AttributeBuilder(AttributeType.SORT_KEY, value, false, false);

export const list = <V extends ListAttributeValues>(value: V) =>
  new AttributeBuilder(AttributeType.LIST, value, false, false);

export const map = <V extends TupleMapBuilderResult>(value: V) =>
  new AttributeBuilder(AttributeType.MAP, value, false, false);

export const set = <V extends SetAttributeValueTypes>(value: V) =>
  new AttributeBuilder(AttributeType.SET, value, false, false);
