import { Attribute, AttributeType } from "./attribute";

export const isAttributeType = <T>(value: any): value is Attribute<AttributeType, T, boolean, boolean> =>
  value && typeof value === "object" && "attributeType" in value;

export const isAttributeOfParticularType = <T, A extends AttributeType>(
  value: any,
  type: A,
): value is Attribute<A, T> => isAttributeType(value) && value.attributeType === type;

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

export const isPartitionKeyAttribute = <T>(value: any): value is Attribute<AttributeType.PARTITION_KEY, T> =>
  isAttributeOfParticularType(value, AttributeType.PARTITION_KEY);

export const isSortKeyAttribute = <T>(value: any): value is Attribute<AttributeType.SORT_KEY, T> =>
  isAttributeOfParticularType(value, AttributeType.SORT_KEY);

export const isNullableAttribute = <T>(value: any): value is Attribute<AttributeType, T, true, unknown> =>
  isAttributeType(value) && Boolean(value.isNullable);
