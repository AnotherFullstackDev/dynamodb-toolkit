import {
  Attribute,
  AttributeType,
  getDataType,
  isAttributeType,
  isBinaryAttribute,
  isBooleanAttribute,
  isDateAttribute,
  isNumberAttribute,
  isStringAttribute,
} from "../attribute/attribute";
import { TupleKeyValue, TupleMap } from "./schema-tuple-map.facade";

export type TypeDescriptorFactory<T> = (value: T) => TypeDescriptorHost;

export type TypeDescriptorHost = Record<string, any>;

export const stringDescriptorFactory: TypeDescriptorFactory<string> = (value: string) => ({
  S: value,
});

export const numberDescriptorFactory: TypeDescriptorFactory<number> = (value: number) => ({
  //   N: value.toString(),
  N: value,
});

export const booleanDescriptorFactory: TypeDescriptorFactory<boolean> = (value: boolean) => ({
  BOOL: value,
});

export const binaryDescriptorFactory: TypeDescriptorFactory<ArrayBuffer> = (value: ArrayBuffer) => ({
  B: value,
});

export const dateDescriptorFactory: TypeDescriptorFactory<Date> = (value: Date) =>
  stringDescriptorFactory(value.toISOString());

export const nullDescriptorFactory: TypeDescriptorFactory<null> = (value: null) => ({
  NULL: value,
});

export const mapDescriptorFactory: TypeDescriptorFactory<Record<string, unknown>> = (
  value: Record<string, unknown>,
) => ({
  M: value,
});

export const listDescriptorFactory: TypeDescriptorFactory<unknown[]> = (value: unknown[]) => ({
  L: value,
});

export const stringSetDescriptorFactory: TypeDescriptorFactory<string[]> = (value: string[]) => ({
  SS: value,
});

export const numberSetDescriptorFactory: TypeDescriptorFactory<number[]> = (value: number[]) => ({
  //   NS: value.map((number) => number.toString()),
  NS: value,
});

export const binarySetDescriptorFactory: TypeDescriptorFactory<ArrayBuffer[]> = (value: ArrayBuffer[]) => ({
  BS: value,
});

export const getDescriptorFactoryForValueByPath = (
  schema: TupleMap,
  path: string,
): TypeDescriptorFactory<any> | null => {
  const value = schema.getByPath(path);

  if (!value) {
    return null;
  }

  const innerValue = value.value();

  return getDescriptorFactoryForValue(innerValue);
};

export const getDescriptorFactoryForValue = (innerValue: unknown): TypeDescriptorFactory<any> | null => {
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

export const transformValueToTypeDescriptor = (
  schema: TupleMap<string> | TupleKeyValue<string, Attribute<AttributeType, unknown> | TupleMap<string>>,
  value: unknown,
): TypeDescriptorHost => {
  //   console.log(value);
  if (Array.isArray(value)) {
    const listElementSchema = (schema as TupleMap<string>).getByPath("[n]"); // path segment format does not matter

    if (!listElementSchema) {
      throw new Error("No definition in shcmea for the list value");
    }

    return listDescriptorFactory(
      value.map((innerValue) => transformValueToTypeDescriptor(listElementSchema, innerValue)),
    );
  }

  if (value && typeof value === "object" && !(value instanceof ArrayBuffer) && !(value instanceof Date)) {
    const result = {} as Record<string, unknown>;

    for (const [key, innerValue] of Object.entries(value as Record<string, unknown>)) {
      //   const descriptorFactory = getDescriptorFactoryForValueByPath(schema as TupleMap<string>, key);
      const fieldSchema = (schema as TupleMap<string>).getByPath(key);

      //   if (!descriptorFactory || !fieldSchema) {
      if (!fieldSchema) {
        throw new Error("No definition in shcmea for the map value");
      }

      //   result[key] = descriptorFactory(transformValueToTypeDescriptor(fieldSchema, innerValue));
      result[key] = transformValueToTypeDescriptor(fieldSchema, innerValue);
    }

    return mapDescriptorFactory(result);
  }

  const valueDescriptorFactory = getDescriptorFactoryForValue((schema as TupleKeyValue<string, unknown>).value());

  if (!valueDescriptorFactory) {
    throw new Error("No type descriptor found for the leaf value");
  }

  //   console.log({ value });
  return valueDescriptorFactory(value);
};
