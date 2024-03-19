import { isAttributeType } from "../attribute/attribute.matchers";
import {
  ExtractTupleMapBuilderResultFromSingleValue,
  InferTupledMap,
  TupleKeyValuePeer,
  TupleMapBuilderResult,
  TypedTupleMapBuilder,
} from "./schema.types";
import { AttributeBuilder } from "../attribute/attribute.builder";

const keyValuePeer = <K extends string, V>(key: K, value: V): TupleKeyValuePeer<K, V> => [key, value];

export const isSchemaBuilderResult = <T>(value: any): value is TupleMapBuilderResult<Record<string, unknown>, T> =>
  value && typeof value === "object" && value.state === "completed";

// @TODO: not type safe!
export const extractSchemaBuilderFieldValue = (
  value: any,
): ExtractTupleMapBuilderResultFromSingleValue<typeof value> => {
  // @TODO: should be deprecated as array types are not used acrosss schema
  if (Array.isArray(value)) {
    return value.map(extractSchemaBuilderFieldValue);
  }

  if (isSchemaBuilderResult(value)) {
    return extractSchemaBuilderFieldValue(value.value);
  }

  if (isAttributeType(value)) {
    return AttributeBuilder.fromAttribute({
      ...value,
      dataType: extractSchemaBuilderFieldValue(value.dataType)
    });
    // return {
    //   ...value,
    //   // attributeType: value.attributeType,
    //   dataType: extractSchemaBuilderFieldValue(value.dataType),
    // };
  }

  return value;
};

/**
 * Builds a tuple map
 * [
 *  [ key, value ],
 *  [ key, value ],
 *  [ key, value ],
 * ]
 * Each key is always a string
 * Each value is always an Attribute
 * The attribute might contain other Attribute or another tuple map
 */
export const schemaBuilderFactory = <T extends TupleKeyValuePeer<string, unknown>[]>(
  state: T,
): TypedTupleMapBuilder<Record<string, unknown>, Record<string, unknown>, T> => {
  return {
    add(key, value) {
      return schemaBuilderFactory([...state, keyValuePeer(key, extractSchemaBuilderFieldValue(value))]);
    },
    build() {
      return {
        interface: null as unknown as Record<string, unknown>,
        state: "completed",
        value: state,
      };
    },
  };
};

export const extractSchemaBuilderResult = <T>(
  value: TupleMapBuilderResult<unknown, T>,
): InferTupledMap<typeof value> => {
  if (!isSchemaBuilderResult(value)) {
    throw new Error("Invalid schema builder result");
  }

  return value.value;
};
