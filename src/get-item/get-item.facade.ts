import {
  InferProjectionFieldsFromSchemas,
  OperationContext,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common/operations-common.types";
import { GenericTupleBuilderResultSchema } from "../general-test";
import { InferTupledMap, TransformTableSchemaIntoTupleSchemasMap, TupleMapBuilderResult } from "../schema/schema.types";
import {
  GetIndividualItemOperationBuilder,
  GetItemOperationBuilder,
  GetItemOperationBuilderStateType,
  GetItemOperationDef,
} from "./get-item.types";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import { KeyConditionExpressionBuilder } from "../condition/condition.types";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import {
  runKeyConditionBuilder,
  serializeKeyConditionDef,
  serializeProjectionFields,
  validateKeyCondition,
} from "../condition/condition.facade";
import { sanitizePlaceholders } from "../operations-common/operations-common.utils";
import { GetItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { transformTypeDescriptorToValue } from "../schema/type-descriptor-converters/schema-type-descriptors.decoders";

export const getIndividualItemOperationBuilder = <S>(
  schema: TupleMap,
  context: OperationContext,
  state: GetItemOperationBuilderStateType,
): GetIndividualItemOperationBuilder<S> => {
  const result: GetIndividualItemOperationBuilder<S> = {
    key: function (builder: KeyConditionExpressionBuilder<any>): GetIndividualItemOperationBuilder<S> {
      const conditions = runKeyConditionBuilder(builder);

      return getIndividualItemOperationBuilder(schema, context, {
        ...state,
        key: conditions,
      });
    },
    projection: function (fields: InferProjectionFieldsFromSchemas<S>): GetIndividualItemOperationBuilder<S> {
      return getIndividualItemOperationBuilder(schema, context, {
        ...state,
        projection: fields as string[],
      });
    },
    returnConsumedCapacity: function (capacity: ReturnConsumedCapacityValues): GetIndividualItemOperationBuilder<S> {
      return getIndividualItemOperationBuilder(schema, context, {
        ...state,
        returnConsumedCapacity: capacity,
      });
    },
    build: function (): GetItemOperationDef {
      if (!state.key) {
        throw new Error("Key condition is required");
      }

      const keyCondition = validateKeyCondition(serializeKeyConditionDef(state.key, schema), schema);
      const serializedProjectionFields = state.projection ? serializeProjectionFields(state.projection) : null;

      return {
        type: OperationType.GET_ITEM,
        key: keyCondition,
        projection: serializedProjectionFields?.attributes.join(", ") ?? null,
        ...sanitizePlaceholders({
          expressionAttributeNames: {
            ...serializedProjectionFields?.placeholders,
          },
          expressionAttributeValues: {},
        }),
        returnConsumedCapacity: state.returnConsumedCapacity,
      };
    },
    execute: function (): Promise<GetItemCommandOutput> {
      const operationDef = result.build();

      return context.runner(context.client, context.tableName, operationDef) as Promise<GetItemCommandOutput>;
    },
    executeAndReturnValue: async function <T = unknown>(): Promise<T | null> {
      const operationResult = await this.execute();

      return operationResult.Item ? (transformTypeDescriptorToValue(schema, operationResult.Item) as T) : null;
    },
  };

  return result;
};

export const getItemOperationBuilderFactory = <
  S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>,
>(
  schema: S,
  context: OperationContext,
): GetItemOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>> => {
  const result: GetItemOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>> = {
    item: (itemName: string) => {
      const tableSchema = TupleMap.fromTableSchema(extractSchemaBuilderResult(schema as any));
      const entitySchema = tableSchema.get(itemName);

      if (!entitySchema) {
        throw new Error(`Entity with name ${itemName} not found in the schema`);
      }

      return getIndividualItemOperationBuilder(entitySchema.value() as TupleMap, context, {
        key: null,
        projection: null,
        returnConsumedCapacity: null,
      });
    },
  } as GetItemOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>>;

  return result;
};
