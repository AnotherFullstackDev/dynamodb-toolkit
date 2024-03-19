import { Attribute, AttributeType, getDataType } from "../../attribute/attribute";
import {
  isBinaryAttribute,
  isBooleanAttribute,
  isDateAttribute,
  isNullableAttribute,
  isNumberAttribute,
  isPartitionKeyAttribute,
  isSortKeyAttribute,
  isStringAttribute,
} from "../../attribute/attribute.matchers";
import { TupleMap } from "../schema-tuple-map.facade";
import { isTupleMap } from "../schema-tuple-map.utils";
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
import { isRecord, shouldBeNulled } from "./schema-type-descriptors.utils";

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

export const withNullableFactory = (factory: TypeDescriptorFactory) => (value: any) =>
  value === null ? nullDescriptorFactory(value) : factory(value);

export const withFactoryWrappersBasedOnModifiers = (attribute: unknown, descriptorFactory: TypeDescriptorFactory) => {
  let factory = descriptorFactory;

  if (isNullableAttribute(attribute)) {
    factory = withNullableFactory(factory);
  }

  return factory;
};

export const getDescriptorFactoryForValue = (attribute: unknown) =>
  withFactoryWrappersBasedOnModifiers(
    attribute,
    ((innerValue: unknown): TypeDescriptorFactory => {
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

      if (innerValue instanceof TupleMap && innerValue.getType() === "MAP") {
        return mapDescriptorFactory;
      }

      if (innerValue instanceof TupleMap && innerValue.getType() === "LIST") {
        return listDescriptorFactory;
      }

      // TODO: add support for sets

      // return null;

      console.error(innerValue);
      throw new Error("No type descriptor found for the value");
    })(attribute),
  );

// Usage of the partition key or sort key is not covered in the descriptor factory selector and tests
export const transformValueToTypeDescriptor = (
  schema: Attribute<AttributeType, unknown> | TupleMap,
  value: unknown,
): TypeDescriptorHost => {
  if (value === undefined && !schema.isOptional) {
    throw new Error("Value is undefined but the schema is not optional!" + " " + JSON.stringify(schema));
  }

  if (value === null && !schema.isNullable) {
    throw new Error("Value is null but the schema is not nullable!" + " " + JSON.stringify(schema));
  }

  if (shouldBeNulled(value, schema)) {
    return nullDescriptorFactory(null);
  }

  if (isTupleMap(schema) && schema.getType() === "LIST") {
    if (!Array.isArray(value)) {
      throw new Error("Schema defines an array but value is not an array! Value is: " + value);
    }

    const listElementSchema = schema.getByPath("[n]"); // path segment format does not matter

    if (!listElementSchema) {
      throw new Error("No definition in schema for the list value");
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

  if (isTupleMap(schema) && (schema.getType() === "MAP" || schema.getType() === "ROOT")) {
    if (!isRecord(value)) {
      throw new Error("Schema defines a map but value is not an object! Value is: " + value);
    }

    // if (shouldBeNulled(value, schema)) {
    //   return nullDescriptorFactory(null);
    // }

    const result = {} as Record<string, unknown>;

    schema.forEach((field) => {
      const fieldValue = (value as Record<string, unknown>)[field.key()];
      const fieldSchema = field.value() as Attribute<AttributeType, unknown> | TupleMap<string>;

      if (fieldValue === undefined && fieldSchema.isOptional) {
        return;
      }

      result[field.key()] = transformValueToTypeDescriptor(fieldSchema, fieldValue);
    });
    // for (const [key, innerValue] of Object.entries(value as Record<string, unknown>)) {
    //   const fieldSchema = schema.getByPath(key);

    //   if (!fieldSchema) {
    //     throw new Error(`No definition in shcmea for the map path "${key}"`);
    //   }

    //   result[key] = transformValueToTypeDescriptor(
    //     fieldSchema.value() as Attribute<AttributeType, unknown> | TupleMap<string>,
    //     innerValue,
    //   );
    // }

    return mapDescriptorFactory(result);
  }

  // if (shouldBeNulled(value, schema)) {
  //   return nullDescriptorFactory(null);
  // }

  const valueDescriptorFactory = getDescriptorFactoryForValue(schema);

  // if (!valueDescriptorFactory) {
  //   console.error({ schema, value });
  //   throw new Error("No type descriptor found for the leaf value");
  // }

  return valueDescriptorFactory(value);
};
