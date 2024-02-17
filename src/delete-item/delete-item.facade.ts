import { DeleteItemCommandOutput } from "@aws-sdk/client-dynamodb";
import {
  runConditionBuilder,
  runKeyConditionBuilder,
  serializeConditionDef,
  serializeKeyConditionDef,
  validateKeyCondition,
} from "../condition/condition.facade";
import { ConditionExpressionBuilder, KeyConditionExpressionBuilder } from "../condition/condition.types";
import { GenericTupleBuilderResultSchema } from "../general-test";
import {
  OperationContext,
  OperationType,
  ReturnConsumedCapacityValues,
  ReturnItemCollectionMetricsValues,
} from "../operations-common/operations-common.types";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import { InferTupledMap, TupleMapBuilderResult } from "../schema/schema.types";
import { transformTypeDescriptorToValue } from "../schema/type-descriptor-converters/schema-type-descriptors.decoders";
import {
  DeleteIndividualItemOperationBuilder,
  DeleteItemOperationBuilder,
  DeleteItemOperationBuilderStateType,
  DeleteItemOperationDef,
  DeleteItemReturnValues,
} from "./delete-item.types";
import { sanitizePlaceholders } from "../operations-common/operations-common.utils";

export const deleteIndividualItemFacadeFactory = <S>(
  schema: TupleMap,
  context: OperationContext,
  state: DeleteItemOperationBuilderStateType,
): DeleteIndividualItemOperationBuilder<InferTupledMap<S>> => {
  const result: DeleteIndividualItemOperationBuilder<InferTupledMap<S>> = {
    key: function (
      builder: KeyConditionExpressionBuilder<any>,
    ): DeleteIndividualItemOperationBuilder<InferTupledMap<S>> {
      const conditions = runKeyConditionBuilder(builder);

      return deleteIndividualItemFacadeFactory(schema, context, {
        ...state,
        key: conditions,
      });
    },
    condition: function (
      builder: ConditionExpressionBuilder<any>,
    ): DeleteIndividualItemOperationBuilder<InferTupledMap<S>> {
      const conditions = runConditionBuilder(builder);

      return deleteIndividualItemFacadeFactory(schema, context, {
        ...state,
        condition: conditions,
      });
    },
    returnValues: function (value: DeleteItemReturnValues): DeleteIndividualItemOperationBuilder<InferTupledMap<S>> {
      return deleteIndividualItemFacadeFactory(schema, context, {
        ...state,
        returnValues: value,
      });
    },
    returnConsumedCapacity: function (
      capacity: ReturnConsumedCapacityValues,
    ): DeleteIndividualItemOperationBuilder<InferTupledMap<S>> {
      return deleteIndividualItemFacadeFactory(schema, context, {
        ...state,
        returnConsumedCapacity: capacity,
      });
    },
    returnItemCollectionMetrics: function (
      value: ReturnItemCollectionMetricsValues,
    ): DeleteIndividualItemOperationBuilder<InferTupledMap<S>> {
      return deleteIndividualItemFacadeFactory(schema, context, {
        ...state,
        returnItemCollectionMetrics: value,
      });
    },
    build: function (): DeleteItemOperationDef {
      if (!state.key) {
        throw new Error("Key condition is not defined");
      }

      const serializedKeyCondition = validateKeyCondition(serializeKeyConditionDef(state.key, schema), schema);
      const serializedCondition = state.condition
        ? serializeConditionDef(state.condition, { conditionIndex: 0 }, schema)
        : null;

      return {
        type: OperationType.DELETE,
        key: serializedKeyCondition,
        condition: serializedCondition?.condition ?? null,
        ...sanitizePlaceholders({
          expressionAttributeNames: {
            ...serializedCondition?.attributeNamePlaceholders,
          },
          expressionAttributeValues: {
            ...serializedCondition?.valuePlaceholders,
          },
        }),
        returnValues: state.returnValues,
        returnConsumedCapacity: state.returnConsumedCapacity,
        returnItemCollectionMetrics: state.returnItemCollectionMetrics,
      };
    },
    execute: function (): Promise<DeleteItemCommandOutput> {
      const operationDef = this.build();

      return context.runner(context.client, context.tableName, operationDef) as Promise<DeleteItemCommandOutput>;
    },
    executeAndReturnValue: async function <T = unknown>(): Promise<T | null> {
      const operationResult = await this.execute();

      console.log("operationResult", operationResult);

      //   TODO: attributes are not decoded properly
      return operationResult.Attributes
        ? (transformTypeDescriptorToValue(schema, operationResult.Attributes) as T)
        : null;
    },
  };

  return result;
};

export const deleteItemFacadeFactory = <S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>>(
  schema: S,
  context: OperationContext,
): DeleteItemOperationBuilder<InferTupledMap<S>> => {
  const result: DeleteItemOperationBuilder<InferTupledMap<S>> = {
    item: function (itemName: string) {
      const tableMap = TupleMap.fromTableSchema(extractSchemaBuilderResult(schema as any)); // @TODO: fix it
      const entityMapHost = tableMap.get(itemName);

      if (!entityMapHost) {
        throw new Error(`Entity ${itemName} not found in schema`);
      }

      return deleteIndividualItemFacadeFactory(entityMapHost.value() as TupleMap, context, {
        key: null,
        condition: null,
        returnValues: null,
        returnConsumedCapacity: null,
        returnItemCollectionMetrics: null,
      });
    },
  } as DeleteItemOperationBuilder<InferTupledMap<S>>;

  return result;
};
