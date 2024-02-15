import { TupleMap } from "../schema/schema-tuple-map.facade";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import {
  GenericCondition,
  InferProjectionFieldsFromSchemas,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common";
import {
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList,
  TupleMapBuilderResult,
  TransformTableSchemaIntoTupleSchemasMap,
  InferTupledMap,
} from "../schema/schema.types";
import { QueryOperationBuilder, QueryOperationIndexSelector, SingleTableQueryOperationBuilder } from "./query.types";
import { runConditionBuilder, serializeConditionDef } from "../condition/condition.facade";
import { GenericTupleBuilderResultSchema } from "../general-test";
import { extractSchemaBuilderResult } from "../schema/schema.builder";

type QueryOperationBuilderStateType = {
  keyCondition: GenericCondition | null;
  filter: GenericCondition | null;
  projection: string | null;
  offset: number | null;
  limit: number | null;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
};

export const singleTableQueryOperationBuilderFactory = <S, IDX>(
  schema: TupleMap,
  state: QueryOperationBuilderStateType,
): SingleTableQueryOperationBuilder<S> & QueryOperationIndexSelector<IDX> => {
  const result: SingleTableQueryOperationBuilder<S> & QueryOperationIndexSelector<IDX> = {
    index: function <N extends keyof IDX>(name: N): SingleTableQueryOperationBuilder<IDX[N]> {
      throw new Error("Function not implemented.");
    },
    keyCondition: function (
      builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
    ): SingleTableQueryOperationBuilder<S> {
      const condition = runConditionBuilder(builder);

      return singleTableQueryOperationBuilderFactory(schema, {
        ...state,
        keyCondition: condition,
      });
    },
    filter: function (
      builder: ConditionExpressionBuilder<PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
    ): SingleTableQueryOperationBuilder<S> {
      const condition = runConditionBuilder(builder);

      return singleTableQueryOperationBuilderFactory(schema, {
        ...state,
        filter: condition,
      });
    },
    projection: function (fields: InferProjectionFieldsFromSchemas<S>): SingleTableQueryOperationBuilder<S> {
      return singleTableQueryOperationBuilderFactory(schema, {
        ...state,
        projection: fields.join(","),
      });
    },
    offset: function (offset: number): SingleTableQueryOperationBuilder<S> {
      throw new Error("Function not implemented.");
      //   return singleTableQueryOperationBuilderFactory(schema, {
      //     ...state,
      //     offset,
      //   });
    },
    limit: function (limit: number): SingleTableQueryOperationBuilder<S> {
      return singleTableQueryOperationBuilderFactory(schema, {
        ...state,
        limit,
      });
    },
    returnConsumedCapacity: function (capacity: ReturnConsumedCapacityValues): SingleTableQueryOperationBuilder<S> {
      return singleTableQueryOperationBuilderFactory(schema, {
        ...state,
        returnConsumedCapacity: capacity,
      });
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

      return {
        type: OperationType.QUERY,
        keyCondition: serializedKeyCondition.condition,
        filter: serializedFilterCondition?.condition ?? null,
        expressionAttributeNames: {
          ...serializedKeyCondition.attributeNamePlaceholders,
          ...serializedFilterCondition?.attributeNamePlaceholders,
        },
        expressionAttributeValues: {
          ...serializedKeyCondition.valuePlaceholders,
          ...serializedFilterCondition?.valuePlaceholders,
        },
        projection: state.projection,
        offset: state.offset,
        limit: state.limit,
        returnConsumedCapacity: state.returnConsumedCapacity,
      };
    },
  };

  return result;
};

export const queryOperationBuilder = <S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>, IDX>(
  schema: S,
  indexes: IDX = {} as IDX,
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

  return singleTableQueryOperationBuilderFactory(tableWithFieldsFromAllModels, {
    keyCondition: null,
    filter: null,
    projection: null,
    offset: null,
    limit: null,
    returnConsumedCapacity: null,
  }) satisfies QueryOperationBuilder<
    TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>,
    { [K in keyof IDX]: TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<IDX[K]>> }
  >;
};
