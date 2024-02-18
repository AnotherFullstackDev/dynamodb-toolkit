import {
  InferProjectionFieldsFromSchemas,
  OperationContext,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common/operations-common.types";
import { GenericTupleBuilderResultSchema } from "../general-test";
import { InferTupledMap, TransformTableSchemaIntoTupleSchemasMap, TupleMapBuilderResult } from "../schema/schema.types";
import { ScanOperationBuilder, ScanOperationBuilderStateType, ScanOperationDef } from "./scan.types";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import { runConditionBuilder, serializeConditionDef, serializeProjectionFields } from "../condition/condition.facade";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import {
  createCombinedTupleMapForAllTableEntitiesFromTableMap,
  createTupleMapFromTableSchema,
} from "../schema/schema-tuple-map.utils";
import { sanitizePlaceholders } from "../operations-common/operations-common.utils";
import { ScanCommandOutput } from "@aws-sdk/client-dynamodb";
import { transformTypeDescriptorToValue } from "../schema/type-descriptor-converters/schema-type-descriptors.decoders";

export const scanOperationBuilderImplementation = <S>(
  schema: TupleMap,
  context: OperationContext,
  state: ScanOperationBuilderStateType,
) => {
  const result: ScanOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>> = {
    filter: function (
      builder: ConditionExpressionBuilder<any>,
    ): ScanOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>> {
      const conditions = runConditionBuilder(builder);

      return scanOperationBuilderImplementation(schema, context, {
        ...state,
        filter: conditions,
      });
    },
    projection: function (
      fields: InferProjectionFieldsFromSchemas<any>,
    ): ScanOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>> {
      return scanOperationBuilderImplementation(schema, context, {
        ...state,
        projection: fields as string[],
      });
    },
    offset: function (
      offset: number,
    ): ScanOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>> {
      throw new Error("Function not implemented.");
    },
    limit: function (limit: number): ScanOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>> {
      return scanOperationBuilderImplementation(schema, context, {
        ...state,
        limit,
      });
    },
    returnConsumedCapacity: function (
      capacity: ReturnConsumedCapacityValues,
    ): ScanOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>> {
      return scanOperationBuilderImplementation(schema, context, {
        ...state,
        returnConsumedCapacity: capacity,
      });
    },
    build: function (): ScanOperationDef {
      if (!state.filter) {
        throw new Error("Filter is required");
      }

      const serializedFilter = serializeConditionDef(state.filter, { conditionIndex: 0 }, schema);
      const serializedProjection = state.projection ? serializeProjectionFields(state.projection) : null;

      return {
        type: OperationType.SCAN,
        filter: serializedFilter.condition,
        projection: serializedProjection?.attributes.join(", ") ?? null,
        ...sanitizePlaceholders({
          expressionAttributeNames: {
            ...serializedFilter.attributeNamePlaceholders,
            ...serializedProjection?.placeholders,
          },
          expressionAttributeValues: {
            ...serializedFilter.valuePlaceholders,
          },
        }),
        offset: state.offset,
        limit: state.limit,
        returnConsumedCapacity: state.returnConsumedCapacity,
      };
    },
    execute: function (): Promise<ScanCommandOutput> {
      const operationDef = this.build();

      return context.runner(context.client, context.tableName, operationDef) as Promise<ScanCommandOutput>;
    },
    executeAndReturnValue: async function <T = unknown>(): Promise<T[] | null> {
      const operationResult = await this.execute();

      return operationResult.Items
        ? operationResult.Items.map((item) => transformTypeDescriptorToValue(schema, item) as T)
        : null;
    },
  };

  return result;
};

export const scanOperationBuilderFacadeFactory = <
  S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>,
>(
  schema: S,
  context: OperationContext,
): ScanOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>> => {
  // TODO: move to a separate function with state and implementation
  const tableMap = createTupleMapFromTableSchema(schema);
  const allEntitiyesSchema = createCombinedTupleMapForAllTableEntitiesFromTableMap(tableMap);

  return scanOperationBuilderImplementation<S>(allEntitiyesSchema, context, {
    filter: null,
    projection: null,
    offset: null,
    limit: null,
    returnConsumedCapacity: null,
  });
};
