// @TODO: solve attributes nulability question;

import { TupleMapBuilderResult } from "./schema";

export type Attribute<A, T> = { attributeType: A; dataType: T };

export type IndexAttributeValueTypes = string | number | boolean;

export type PartitionKey<T extends IndexAttributeValueTypes> = Attribute<"PARTITION_KEY", T>;

export type SortKey<T extends IndexAttributeValueTypes> = Attribute<"SORT_KEY", T>;

// A tuple attribute can be created based on the list type
// export type ListAttribute<T> = Attribute<"LIST", T[]>;
export type ListAttribute<T> = Attribute<"LIST", T>; // changing type from T[] to T to avoid problems with extracting Attribute value types

export type MapAttribute<T> = Attribute<"MAP", T>;

export type SetAttributeValueTypes = string | number;

// Set attribute can contain string, number and binary types
// export type SetAttribute<T extends SetAttributeValueTypes> = Attribute<"SET", T[]>;
export type SetAttribute<T extends SetAttributeValueTypes> = Attribute<"SET", T>; // changing type from T[] to T to avoid problems with extracting Attribute value types

export type RegularAttributeValueTypes = string | number | bigint | boolean;

export type RegularAttribute<V> = Attribute<"REGULAR", V>;

export type DateAttribute<V> = Attribute<"DATE", V>;

export type BinaryAttribute<V> = Attribute<"BINARY", V>;

export type InferOriginalOrAttributeDataType<T> = T extends Attribute<unknown, infer U> ? U : T;

const isAttributeType = (value: any): value is Attribute<unknown, unknown> =>
  value && typeof value === "object" && "attributeType" in value;

const getDataType = <T>(value: T | Attribute<unknown, T>): T => (isAttributeType(value) ? value.dataType : value);

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

export const string = <V extends string>(): RegularAttribute<V> => ({
  attributeType: "REGULAR",
  dataType: String as unknown as V,
});

export const number = <V extends number>(): RegularAttribute<V> => ({
  attributeType: "REGULAR",
  dataType: Number as unknown as V,
});

export const bool = <V extends boolean>(): RegularAttribute<V> => ({
  attributeType: "REGULAR",
  dataType: Boolean as unknown as V,
});

export const date = <V extends Date>(): DateAttribute<V> => ({
  attributeType: "DATE",
  dataType: Date as unknown as V,
});

// @TODO: binary data type requires additional work
export const binary = <V extends ArrayBufferLike>(): BinaryAttribute<V> => ({
  attributeType: "BINARY",
  dataType: ArrayBuffer as unknown as V,
});

export const partitionKey = <V extends IndexAttributeValueTypes>(
  value: V | Attribute<unknown, V>,
): PartitionKey<V> => ({
  attributeType: "PARTITION_KEY",
  dataType: getDataType(value),
});

export const sortKey = <V extends IndexAttributeValueTypes>(value: V | Attribute<unknown, V>): SortKey<V> => ({
  attributeType: "SORT_KEY",
  dataType: getDataType(value),
});

export const list = <V>(value: V): ListAttribute<V> => ({
  attributeType: "LIST",
  dataType: value,
});

export const map = <V extends TupleMapBuilderResult>(value: V): MapAttribute<V> => ({
  attributeType: "MAP",
  dataType: value,
});

export const set = <V extends SetAttributeValueTypes>(value: V): SetAttribute<V> => ({
  attributeType: "SET",
  dataType: value,
});
