import { Attribute, AttributeType } from "../../attribute/attribute";
import { TupleMap } from "../schema-tuple-map.facade";
import {
  AttributeTypeDescriptorKey,
  ListTypeDescriptor,
  MapTypeDescriptor,
  TypeDescriptor,
  TypeDescriptorDecoder,
} from "./schema-type-descriptors.types";

const decodersToTypeDescriptorsMap: Record<AttributeTypeDescriptorKey, TypeDescriptorDecoder> = {
  S: (value) => value.S,
  N: (value) => value.N,
  B: (value) => value.B,
  BOOL: (value) => value.BOOL,
  NULL: (value) => value.NULL,
  M: (value) => value.M,
  L: (value) => value.L,
  SS: (value) => value.SS,
  NS: (value) => value.NS,
  BS: (value) => value.BS,
};

export const getDecoderFactoryForValue = (value: Record<string, unknown>): TypeDescriptorDecoder => {
  const typeDescriptorKey = Object.keys(decodersToTypeDescriptorsMap).find(
    (key): key is keyof typeof decodersToTypeDescriptorsMap =>
      value && typeof value === "object" && value.hasOwnProperty(key),
  );

  if (typeDescriptorKey) {
    return decodersToTypeDescriptorsMap[typeDescriptorKey];
  }

  return ((value: unknown) => value) as any; // TODO: fix it
};

// @TODO: the transformers should be rewritten to be fully driven by a shcema
export const transformTypeDescriptorToValue = (
  schema: TupleMap | Attribute<AttributeType, unknown>,
  value: Record<string, unknown> | unknown[] | unknown,
): unknown => {
  if (schema instanceof TupleMap && schema.getType() === "LIST") {
    const listItemSchema = schema.getByPath("[0]");

    if (!listItemSchema) {
      throw new Error("List item schema is not found");
    }

    const listDecoder = getDecoderFactoryForValue(value as ListTypeDescriptor);

    return listDecoder(value as ListTypeDescriptor).map((item: unknown) =>
      transformTypeDescriptorToValue(listItemSchema.value(), item),
    );
  }

  if (schema instanceof TupleMap && (schema.getType() === "MAP" || schema.getType() === "ROOT")) {
    const result: Record<string, unknown> = {};
    const valueDecoder = getDecoderFactoryForValue(value as MapTypeDescriptor);
    const unwrappedValue = valueDecoder(value as MapTypeDescriptor) as Record<string, unknown>;

    for (const [key, value] of Object.entries(unwrappedValue)) {
      const fieldSchema = schema.getByPath(key);

      if (!fieldSchema) {
        throw new Error("Field schema is not found");
      }

      result[key] = transformTypeDescriptorToValue(fieldSchema.value(), value);
    }

    return result;
  }

  const decoder = getDecoderFactoryForValue(value as TypeDescriptor<string, unknown>);

  return decoder(value as TypeDescriptor<string, unknown>);
};
