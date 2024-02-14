// @TODO: solve attributes nulability question;

import { TupleMapBuilderResult } from "../schema/schema.types";

export type Attribute<A, T> = { attributeType: A; dataType: T };

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

export type PartitionKey<T extends IndexAttributeValueTypes> = Attribute<AttributeType.PARTITION_KEY, T>;

export type SortKey<T extends IndexAttributeValueTypes> = Attribute<AttributeType.SORT_KEY, T>;

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

export const isAttributeType = <T>(value: any): value is Attribute<unknown, T> =>
  value && typeof value === "object" && "attributeType" in value;

export const isAttributeOfParticularType = <T, A extends AttributeType>(
  value: any,
  type: A,
): value is Attribute<A, T> => isAttributeType(value) && value.attributeType === type;

export const getDataType = <T>(value: T | Attribute<unknown, T>): T =>
  isAttributeType(value) ? value.dataType : value;

export const isStringAttribute = (value: any): value is Attribute<AttributeType.REGULAR, string> =>
  isAttributeOfParticularType(value, AttributeType.REGULAR) && Object.is(value.dataType, String);

export const isNumberAttribute = (value: any): value is Attribute<AttributeType.REGULAR, number> =>
  isAttributeOfParticularType(value, AttributeType.REGULAR) && Object.is(value.dataType, Number);

export const isBinaryAttribute = (value: any): value is Attribute<AttributeType.BINARY, ArrayBuffer> =>
  isAttributeOfParticularType(value, AttributeType.BINARY) && Object.is(value.dataType, ArrayBuffer);

export const isBooleanAttribute = (value: any): value is Attribute<AttributeType.REGULAR, boolean> =>
  isAttributeOfParticularType(value, AttributeType.REGULAR) && Object.is(value.dataType, Boolean);

export const isDateAttribute = (value: any): value is Attribute<AttributeType.DATE, Date> =>
  isAttributeOfParticularType(value, AttributeType.DATE);

export const isListAttribute = <T>(value: any): value is Attribute<AttributeType.LIST, T> =>
  isAttributeOfParticularType(value, AttributeType.LIST);

export const isMapAttribute = <T>(value: any): value is Attribute<AttributeType.MAP, T> =>
  isAttributeOfParticularType(value, AttributeType.MAP);

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
  attributeType: AttributeType.REGULAR,
  dataType: String as unknown as V,
});

export const number = <V extends number>(): RegularAttribute<V> => ({
  attributeType: AttributeType.REGULAR,
  dataType: Number as unknown as V,
});

export const bool = <V extends boolean>(): RegularAttribute<V> => ({
  attributeType: AttributeType.REGULAR,
  dataType: Boolean as unknown as V,
});

export const date = <V extends Date>(): DateAttribute<V> => ({
  attributeType: AttributeType.DATE,
  dataType: Date as unknown as V,
});

// @TODO: binary data type requires additional work
export const binary = <V extends ArrayBufferLike>(): BinaryAttribute<V> => ({
  attributeType: AttributeType.BINARY,
  dataType: ArrayBuffer as unknown as V,
});

export const partitionKey = <V extends IndexAttributeValueTypes>(
  value: V | Attribute<unknown, V>,
): PartitionKey<V> => ({
  attributeType: AttributeType.PARTITION_KEY,
  dataType: getDataType(value),
});

export const sortKey = <V extends IndexAttributeValueTypes>(value: V | Attribute<unknown, V>): SortKey<V> => ({
  attributeType: AttributeType.SORT_KEY,
  dataType: getDataType(value),
});

export const list = <V extends ListAttributeValues>(value: V): ListAttribute<V> => ({
  attributeType: AttributeType.LIST,
  dataType: value,
});

export const map = <V extends TupleMapBuilderResult>(value: V): MapAttribute<V> => ({
  attributeType: AttributeType.MAP,
  dataType: value,
});

export const set = <V extends SetAttributeValueTypes>(value: V): SetAttribute<V> => ({
  attributeType: AttributeType.SET,
  dataType: value,
});
