import {
  Attribute,
  AttributeType,
  getDataType,
  isAttributeType,
  isBinaryAttribute,
  isBooleanAttribute,
  isDateAttribute,
  isNumberAttribute,
  isPartitionKeyAttribute,
  isSortKeyAttribute,
  isStringAttribute,
} from "../../attribute/attribute";
import { TupleKeyValue, TupleMap } from "../schema-tuple-map.facade";
import {
  BinarySetTypeDescriptor,
  BinaryTypeDescriptor,
  BooleanTypeDescriptor,
  ListTypeDescriptor,
  MapTypeDescriptor,
  NullTypeDescriptor,
  NumberSetTypeDescriptor,
  NumberTypeDescriptor,
  StringSetTypeDescriptor,
  StringTypeDescriptor,
  TypeDescriptor,
} from "./schema-type-descriptors.types";

export type TypeDescriptorFactory = (value: any) => TypeDescriptor<string, unknown>;

export type TypeDescriptorHost = Record<string, any>;

export const stringDescriptorFactory = (value: string): StringTypeDescriptor => ({
  S: value,
});

export const numberDescriptorFactory = (value: number): NumberTypeDescriptor => ({
  N: String(value),
});

export const booleanDescriptorFactory = (value: boolean): BooleanTypeDescriptor => ({
  BOOL: value,
});

export const binaryDescriptorFactory = (value: ArrayBuffer): BinaryTypeDescriptor => ({
  B: value,
});

export const dateDescriptorFactory = (value: Date): StringTypeDescriptor =>
  stringDescriptorFactory(value.toISOString());

export const nullDescriptorFactory = (value: null): NullTypeDescriptor => ({
  NULL: value,
});

export const mapDescriptorFactory = (value: Record<string, unknown>): MapTypeDescriptor => ({
  M: value,
});

export const listDescriptorFactory = (value: unknown[]): ListTypeDescriptor => ({
  L: value,
});

export const stringSetDescriptorFactory = (value: string[]): StringSetTypeDescriptor => ({
  SS: value,
});

export const numberSetDescriptorFactory = (value: number[]): NumberSetTypeDescriptor => ({
  //   NS: value.map((number) => number.toString()),
  NS: value,
});

export const binarySetDescriptorFactory = (value: ArrayBuffer[]): BinarySetTypeDescriptor => ({
  BS: value,
});

export const getDescriptorFactoryForValueByPath = (schema: TupleMap, path: string): TypeDescriptorFactory | null => {
  const value = schema.getByPath(path);

  if (!value) {
    return null;
  }

  const innerValue = value.value();

  return getDescriptorFactoryForValue(innerValue);
};

export const getDescriptorFactoryForValue = (innerValue: unknown): TypeDescriptorFactory | null => {
  if (isPartitionKeyAttribute(innerValue) || isSortKeyAttribute(innerValue)) {
    return getDescriptorFactoryForValue(getDataType(innerValue));
  }

  if (isStringAttribute(innerValue)) {
    return stringDescriptorFactory;
  }

  if (isNumberAttribute(innerValue)) {
    return numberDescriptorFactory;
  }

  if (isBinaryAttribute(innerValue)) {
    return binaryDescriptorFactory;
  }

  if (isBooleanAttribute(innerValue)) {
    return booleanDescriptorFactory;
  }

  if (isDateAttribute(innerValue)) {
    return dateDescriptorFactory;
  }

  // TODO: add support for type nullability
  if (false) {
    return nullDescriptorFactory;
  }

  if (innerValue instanceof TupleMap && innerValue.getType() === "MAP") {
    return mapDescriptorFactory;
  }

  if (innerValue instanceof TupleMap && innerValue.getType() === "LIST") {
    return listDescriptorFactory;
  }

  // TODO: add support for sets

  return null;
};

// Usage of the partition key or sort key is not covered in the descriptor factory selector and tests
export const transformValueToTypeDescriptor = (
  schema: Attribute<AttributeType, unknown> | TupleMap<string>,
  value: unknown,
): TypeDescriptorHost => {
  if (schema instanceof TupleMap && schema.getType() === "LIST") {
    if (!Array.isArray(value)) {
      throw new Error("Schema defines an array but value is not an array! Value is: " + value);
    }

    const listElementSchema = (schema as TupleMap<string>).getByPath("[n]"); // path segment format does not matter

    if (!listElementSchema) {
      throw new Error("No definition in shcmea for the list value");
    }

    return listDescriptorFactory(
      value.map((innerValue) =>
        transformValueToTypeDescriptor(
          listElementSchema.value() as Attribute<AttributeType, unknown> | TupleMap<string>,
          innerValue,
        ),
      ),
    );
  }

  if (schema instanceof TupleMap && (schema.getType() === "MAP" || schema.getType() === "ROOT")) {
    if (!value || typeof value !== "object") {
      throw new Error("Schema defines a map but value is not an object! Value is: " + value);
    }

    const result = {} as Record<string, unknown>;

    for (const [key, innerValue] of Object.entries(value as Record<string, unknown>)) {
      const fieldSchema = (schema as TupleMap<string>).getByPath(key);

      if (!fieldSchema) {
        throw new Error("No definition in shcmea for the map value");
      }

      result[key] = transformValueToTypeDescriptor(
        fieldSchema.value() as Attribute<AttributeType, unknown> | TupleMap<string>,
        innerValue,
      );
    }

    return mapDescriptorFactory(result);
  }

  const valueDescriptorFactory = getDescriptorFactoryForValue(schema);

  if (!valueDescriptorFactory) {
    console.error({ schema, value });
    throw new Error("No type descriptor found for the leaf value");
  }

  return valueDescriptorFactory(value);
};
