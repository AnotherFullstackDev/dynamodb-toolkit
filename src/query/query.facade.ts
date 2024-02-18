import { QueryCommandOutput } from "@aws-sdk/client-dynamodb";
import {
  getAttributeNamePlaceholder,
  runConditionBuilder,
  serializeConditionDef,
  serializeProjectionFields,
} from "../condition/condition.facade";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import { GenericTupleBuilderResultSchema } from "../general-test";
import {
  GenericCondition,
  InferProjectionFieldsFromSchemas,
  OperationContext,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common/operations-common.types";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import {
  InferTupledMap,
  PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
} from "../schema/schema.types";
import {
  QueryOperationBuilder,
  QueryOperationBuilderStateType,
  QueryOperationIndexSelector,
  SingleTableQueryOperationBuilder,
} from "./query.types";
import { transformTypeDescriptorToValue } from "../schema/type-descriptor-converters/schema-type-descriptors.decoders";
import {
  createCombinedTupleMapForAllTableEntitiesFromTableMap,
  createTupleMapFromTableSchema,
} from "../schema/schema-tuple-map.utils";

export const singleTableQueryOperationBuilderFactory = <S, IDX>(
  schema: TupleMap,
  state: QueryOperationBuilderStateType,
  context: OperationContext,
): SingleTableQueryOperationBuilder<S> & QueryOperationIndexSelector<IDX> => {
  const result: SingleTableQueryOperationBuilder<S> & QueryOperationIndexSelector<IDX> = {
    index: function <N extends keyof IDX>(name: N): SingleTableQueryOperationBuilder<IDX[N]> {
      throw new Error("Function not implemented.");
    },
    keyCondition: function (
      builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
    ): SingleTableQueryOperationBuilder<S> {
      const condition = runConditionBuilder(builder);

      return singleTableQueryOperationBuilderFactory(
        schema,
        {
          ...state,
          keyCondition: condition,
        },
        context,
      );
    },
    filter: function (
      builder: ConditionExpressionBuilder<PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
    ): SingleTableQueryOperationBuilder<S> {
      const condition = runConditionBuilder(builder);

      return singleTableQueryOperationBuilderFactory(
        schema,
        {
          ...state,
          filter: condition,
        },
        context,
      );
    },
    projection: function (fields: InferProjectionFieldsFromSchemas<S>): SingleTableQueryOperationBuilder<S> {
      return singleTableQueryOperationBuilderFactory(
        schema,
        {
          ...state,
          projection: fields as string[],
        },
        context,
      );
    },
    offset: function (offset: number): SingleTableQueryOperationBuilder<S> {
      throw new Error("Function not implemented.");
    },
    limit: function (limit: number): SingleTableQueryOperationBuilder<S> {
      return singleTableQueryOperationBuilderFactory(
        schema,
        {
          ...state,
          limit,
        },
        context,
      );
    },
    returnConsumedCapacity: function (capacity: ReturnConsumedCapacityValues): SingleTableQueryOperationBuilder<S> {
      return singleTableQueryOperationBuilderFactory(
        schema,
        {
          ...state,
          returnConsumedCapacity: capacity,
        },
        context,
      );
    },
    build: function () {
      const serializedKeyCondition = state.keyCondition
        ? serializeConditionDef(state.keyCondition, { conditionIndex: 0 }, schema)
        : null;

      if (!serializedKeyCondition?.condition) {
        throw new Error("Key condition must be provided!");
      }

      const serializedFilterCondition = state.filter
        ? serializeConditionDef(state.filter, { conditionIndex: 0 }, schema)
        : null;

      // @TODO: take a look at how field name placeholders are built because names clash + exaluate if it can be harmful
      //   Probably there is no need in making field names specific across values of an operation
      const projectionAttributes = state.projection ? serializeProjectionFields(state.projection) : null;

      return {
        type: OperationType.QUERY,
        keyCondition: serializedKeyCondition.condition,
        filter: serializedFilterCondition?.condition ?? null,
        expressionAttributeNames: {
          ...serializedKeyCondition.attributeNamePlaceholders,
          ...serializedFilterCondition?.attributeNamePlaceholders,
          ...projectionAttributes?.placeholders,
        },
        expressionAttributeValues: {
          ...serializedKeyCondition.valuePlaceholders,
          ...serializedFilterCondition?.valuePlaceholders,
        },
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

export const queryOperationBuilder = <S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>, IDX>(
  schema: S,
  indexes: IDX = {} as IDX,
  context: OperationContext,
): QueryOperationBuilder<
  TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>,
  { [K in keyof IDX]: TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<IDX[K]>> }
> => {
  const tableSchema = createTupleMapFromTableSchema(schema);
  const tableWithFieldsFromAllModels = createCombinedTupleMapForAllTableEntitiesFromTableMap(tableSchema);

  return singleTableQueryOperationBuilderFactory(
    tableWithFieldsFromAllModels,
    {
      keyCondition: null,
      filter: null,
      projection: null,
      offset: null,
      limit: null,
      returnConsumedCapacity: null,
    },
    context,
  ) satisfies QueryOperationBuilder<
    TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>,
    { [K in keyof IDX]: TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<IDX[K]>> }
  >;
};
