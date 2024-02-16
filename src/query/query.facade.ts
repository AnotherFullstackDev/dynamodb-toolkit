import { QueryCommandOutput } from "@aws-sdk/client-dynamodb";
import { getAttributeNamePlaceholder, runConditionBuilder, serializeConditionDef } from "../condition/condition.facade";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import { GenericTupleBuilderResultSchema } from "../general-test";
import {
  GenericCondition,
  InferProjectionFieldsFromSchemas,
  OperationContext,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import {
  InferTupledMap,
  PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
} from "../schema/schema.types";
import { QueryOperationBuilder, QueryOperationIndexSelector, SingleTableQueryOperationBuilder } from "./query.types";
import { transformTypeDescriptorToValue } from "../schema/type-descriptor-converters/schema-type-descriptors.decoders";

type QueryOperationBuilderStateType = {
  keyCondition: GenericCondition | null;
  filter: GenericCondition | null;
  projection: string[] | null;
  offset: number | null;
  limit: number | null;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
};

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
      const projectionAttributes = state.projection
        ? state.projection
            .map((fieldName) => getAttributeNamePlaceholder(fieldName, "proj"))
            .reduce<{ attributes: string[]; placeholders: Record<string, string> }>(
              (result, item) => {
                return {
                  attributes: [...result.attributes, item.attributeNamePlaceholder],
                  placeholders: { ...result.placeholders, ...item.attributeNamePlaceholderValues },
                };
              },
              { attributes: [], placeholders: {} },
            )
        : null;

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
  const tableSchema = TupleMap.fromTableSchema(extractSchemaBuilderResult(schema) as any); // TODO: fix this
  const tableWithFieldsFromAllModels = new TupleMap("ROOT", []);

  tableSchema.forEach((pear) => {
    const modelSchema = pear.value() as TupleMap;

    modelSchema.forEach((modelField) => {
      if (tableWithFieldsFromAllModels.has(modelField.key())) {
        throw new Error(`Field ${modelField.key()} is already defined in the table!`);
      }

      tableWithFieldsFromAllModels.set(modelField.key(), modelField.value() as any);
    });
  });

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
