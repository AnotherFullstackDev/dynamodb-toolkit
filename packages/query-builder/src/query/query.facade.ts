import { QueryCommandOutput } from "@aws-sdk/client-dynamodb";
import { runConditionBuilder, serializeConditionDef, serializeProjectionFields } from "../condition/condition.facade";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import { GenericTupleBuilderResultSchema } from "../general-test";
import {
  InferProjectionFieldsFromSchemas,
  OperationContext,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common/operations-common.types";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import {
  createCombinedTupleMapForAllTableEntitiesFromTableMap,
  createTupleMapFromTableSchema,
} from "../schema/schema-tuple-map.utils";
import {
  InferTupledMap,
  PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
} from "../schema/schema.types";
import { transformTypeDescriptorToValue } from "../schema/type-descriptor-converters/schema-type-descriptors.decoders";
import {
  QueryOperationBuilder,
  QueryOperationBuilderStateType,
  QueryOperationIndexSelector,
  SingleTableQueryOperationBuilder,
} from "./query.types";
import { sanitizePlaceholders } from "../operations-common/operations-common.utils";

export const singleTableQueryOperationBuilderFactory = <
  S,
  IDX extends Record<string, TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>>,
>(
  schema: TupleMap,
  indexes: IDX,
  context: OperationContext,
  state: QueryOperationBuilderStateType,
): SingleTableQueryOperationBuilder<S> & QueryOperationIndexSelector<IDX> => {
  const result: SingleTableQueryOperationBuilder<S> & QueryOperationIndexSelector<IDX> = {
    index: function <N extends keyof IDX>(name: N): SingleTableQueryOperationBuilder<IDX[N]> {
      const indexSchema = indexes[name];

      if (!indexSchema) {
        throw new Error(`Index ${String(name)} does not exist in the schema`);
      }

      const indexTableMap = createTupleMapFromTableSchema(indexSchema);
      const indexTableWithFieldsFromAllModels = createCombinedTupleMapForAllTableEntitiesFromTableMap(indexTableMap);

      return singleTableQueryOperationBuilderFactory(indexTableWithFieldsFromAllModels, {}, context, {
        indexName: String(name),
        keyCondition: null,
        filter: null,
        projection: null,
        offset: null,
        limit: null,
        returnConsumedCapacity: null,
      }) as SingleTableQueryOperationBuilder<IDX[N]>;
    },
    keyCondition: function (
      builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
    ): SingleTableQueryOperationBuilder<S> {
      const condition = runConditionBuilder(builder);

      return singleTableQueryOperationBuilderFactory(schema, indexes, context, {
        ...state,
        keyCondition: condition,
      });
    },
    filter: function (
      builder: ConditionExpressionBuilder<PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
    ): SingleTableQueryOperationBuilder<S> {
      const condition = runConditionBuilder(builder);

      return singleTableQueryOperationBuilderFactory(schema, indexes, context, {
        ...state,
        filter: condition,
      });
    },
    projection: function (fields: InferProjectionFieldsFromSchemas<S>): SingleTableQueryOperationBuilder<S> {
      return singleTableQueryOperationBuilderFactory(schema, indexes, context, {
        ...state,
        projection: fields as string[],
      });
    },
    offset: function (offset: number): SingleTableQueryOperationBuilder<S> {
      throw new Error("Function not implemented.");
    },
    limit: function (limit: number): SingleTableQueryOperationBuilder<S> {
      return singleTableQueryOperationBuilderFactory(schema, indexes, context, {
        ...state,
        limit,
      });
    },
    returnConsumedCapacity: function (capacity: ReturnConsumedCapacityValues): SingleTableQueryOperationBuilder<S> {
      return singleTableQueryOperationBuilderFactory(schema, indexes, context, {
        ...state,
        returnConsumedCapacity: capacity,
      });
    },
    build: function () {
      if (!state.keyCondition) {
        throw new Error("Key condition is required");
      }

      const serializedKeyCondition = serializeConditionDef(state.keyCondition, { conditionIndex: 0 }, schema);

      const serializedFilterCondition = state.filter
        ? serializeConditionDef(state.filter, { conditionIndex: 0 }, schema)
        : null;

      // @TODO: take a look at how field name placeholders are built because names clash + exaluate if it can be harmful
      //   Probably there is no need in making field names specific across values of an operation
      const projectionAttributes = state.projection ? serializeProjectionFields(state.projection) : null;

      return {
        type: OperationType.QUERY,
        indexName: state.indexName,
        keyCondition: serializedKeyCondition.condition,
        filter: serializedFilterCondition?.condition ?? null,
        ...sanitizePlaceholders({
          expressionAttributeNames: {
            ...serializedKeyCondition.attributeNamePlaceholders,
            ...serializedFilterCondition?.attributeNamePlaceholders,
            ...projectionAttributes?.placeholders,
          },
          expressionAttributeValues: {
            ...serializedKeyCondition.valuePlaceholders,
            ...serializedFilterCondition?.valuePlaceholders,
          },
        }),
        projection: projectionAttributes?.attributes.join(", ") ?? null,
        offset: state.offset,
        limit: state.limit,
        returnConsumedCapacity: state.returnConsumedCapacity,
      };
    },
    execute: async function (): Promise<QueryCommandOutput> {
      const operationDef = this.build();

      return (await context.runner(context.client, context.tableName, operationDef)) as QueryCommandOutput;
    },
    executeAndReturnValue: async function <T = unknown>(): Promise<T> {
      const operationResult = await this.execute();

      return (operationResult.Items ?? []).map((item) => transformTypeDescriptorToValue(schema, item)) as T;
    },
  };

  return result;
};

export const queryOperationBuilder = <
  S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>,
  IDX extends Record<string, TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>>,
>(
  schema: S,
  indexes: IDX = {} as IDX,
  context: OperationContext,
): QueryOperationBuilder<
  TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>,
  { [K in keyof IDX]: TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<IDX[K]>> }
> => {
  const tableSchema = createTupleMapFromTableSchema(schema);
  const tableWithFieldsFromAllModels = createCombinedTupleMapForAllTableEntitiesFromTableMap(tableSchema);

  return singleTableQueryOperationBuilderFactory(tableWithFieldsFromAllModels, indexes, context, {
    indexName: null,
    keyCondition: null,
    filter: null,
    projection: null,
    offset: null,
    limit: null,
    returnConsumedCapacity: null,
  }) as QueryOperationBuilder<
    TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>,
    { [K in keyof IDX]: TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<IDX[K]>> }
  >;
};
