// implementation of put item

import { AttributeType, isAttributeOfParticularType } from "../attribute";
import { runConditionBuilder } from "../condition/condition.facade";
import {
  ComparisonOperatorDefinition,
  ConditionExpressionBuilder,
  EntitySchema,
  LogicalOperatorDefinition,
  OperatorDefinition,
} from "../condition/condition.types";
import { ReturnConsumedCapacityValues, ReturnItemCommectionMetricsValues } from "../operations-common";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import {
  InferTupledMap,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
} from "../schema/schema.types";
import { GenericInterfaceTableSchema, GenericTupleBuilderResultSchema } from "../test";
import { PutItemReturnValues, PutOperationAdditionalParamsBuilder, PutOperationBuilder } from "./put-item.types";

/**
 * Common implementations
 * - transformation of fields into placeholders and aliases
 * - transformation of values into placeholders and aliases
 * - creation of type descriptors for field values
 */

type PutItemStateType = {
  item: Record<string, unknown>;
  condition:
    | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>
    | OperatorDefinition<"logical", LogicalOperatorDefinition>
    | null;
  returnValues: PutItemReturnValues | null;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
  returnItemCollectionMetrics: ReturnItemCommectionMetricsValues | null;
};

const putItemAdditionaOperationsFactory = <TS extends GenericTupleBuilderResultSchema>(
  schema: TS,
  state: PutItemStateType,
): PutOperationAdditionalParamsBuilder<TS> => {
  const schemaTupleMap = new TupleMap(schema);
  //   const result: PutOperationAdditionalParamsBuilder<GenericTupleTableSchema> = {
  const result = {
    condition: function (builder: ConditionExpressionBuilder<any>): PutOperationAdditionalParamsBuilder<TS> {
      const conditions = runConditionBuilder(builder);

      return putItemAdditionaOperationsFactory(schema, {
        ...state,
        condition: conditions,
      });
    },
    throwIfExists: function (): PutOperationAdditionalParamsBuilder<TS> {
      if (state.condition) {
        throw new Error("Condition already set");
      }

      const partitionKey = schemaTupleMap.find((item) => {
        return isAttributeOfParticularType(item.value(), AttributeType.PARTITION_KEY);
      });
      const sortKey = schemaTupleMap.find((item) => {
        return isAttributeOfParticularType(item.value(), AttributeType.SORT_KEY);
      });

      if (!partitionKey) {
        throw new Error("Partition key is not defined for the schema");
      }

      const builder: ConditionExpressionBuilder<any> = (comparisonFactory, logicalFactory) => {
        if (sortKey) {
          return logicalFactory.and([
            comparisonFactory(partitionKey.key(), "=", partitionKey.value()),
            comparisonFactory(sortKey.key(), "=", sortKey.value()),
          ]);
        }

        return comparisonFactory(partitionKey.key(), "=", partitionKey.value());
      };

      return putItemAdditionaOperationsFactory(schema, {
        ...state,
        condition: runConditionBuilder(builder),
      });
    },
    returnValues: function (value: PutItemReturnValues): PutOperationAdditionalParamsBuilder<TS> {
      return putItemAdditionaOperationsFactory(schema, {
        ...state,
        returnValues: value,
      });
    },
    returnConsumedCapacity: function (capacity: ReturnConsumedCapacityValues): PutOperationAdditionalParamsBuilder<TS> {
      return putItemAdditionaOperationsFactory(schema, {
        ...state,
        returnConsumedCapacity: capacity,
      });
    },
    returnItemCollectionMetrics: function (
      value: ReturnItemCommectionMetricsValues,
    ): PutOperationAdditionalParamsBuilder<TS> {
      return putItemAdditionaOperationsFactory(schema, {
        ...state,
        returnItemCollectionMetrics: value,
      });
    },
  };

  return result;
  //   return result satisfies PutOperationAdditionalParamsBuilder<TransformTableSchemaIntoSchemaInterfacesMap<S>>;
  // return result satisfies PutOperationAdditionalParamsBuilder<GenericTupleTableSchema>;
};

export const putItemFacadeFactory = <S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>>(
  // export const putItemFacadeFactory = <S extends GenericTupleTableSchema>(
  schema: S,
): PutOperationBuilder<
  TransformTableSchemaIntoSchemaInterfacesMap<InferTupledMap<S>>,
  TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>
> => {
  const result = {
    // @TODO: we might put the item object to descriptors transformation here
    item: (name, value) =>
      putItemAdditionaOperationsFactory(extractSchemaBuilderResult(schema), {
        item: value,
        condition: null,
        returnValues: null,
        returnConsumedCapacity: null,
        returnItemCollectionMetrics: null,
      }),
  } satisfies PutOperationBuilder<GenericInterfaceTableSchema, GenericTupleBuilderResultSchema>;

  return result as unknown as PutOperationBuilder<
    TransformTableSchemaIntoSchemaInterfacesMap<InferTupledMap<S>>,
    TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>
  >;
};
