import { PutItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { AttributeType } from "../attribute/attribute";
import { isAttributeOfParticularType } from "../attribute/attribute.matchers";
import { runConditionBuilder, serializeConditionDef } from "../condition/condition.facade";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import { GenericInterfaceTableSchema, GenericTupleBuilderResultSchema } from "../schema/schema.types";
import {
  GenericCondition,
  OperationContext,
  OperationType,
  ReturnConsumedCapacityValues,
  ReturnItemCollectionMetricsValues,
} from "../operations-common/operations-common.types";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import {
  InferTupledMap,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
} from "../schema/schema.types";
import { transformValueToTypeDescriptor } from "../schema/type-descriptor-converters/schema-type-descriptors.encoders";
import {
  PutItemOperationDef,
  PutItemReturnValues,
  PutOperationAdditionalParamsBuilder,
  PutOperationBuilder,
} from "./put-item.types";

type PutItemStateType = {
  item: Record<string, unknown>;
  condition: GenericCondition | null;
  returnValues: PutItemReturnValues | null;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
  returnItemCollectionMetrics: ReturnItemCollectionMetricsValues | null;
};

// const putItemAdditionaOperationsFactory = <TS extends GenericTupleBuilderResultSchema>(
const putItemAdditionaOperationsFactory = <TS extends TupleMap>(
  schema: TS,
  state: PutItemStateType,
  context: OperationContext,
): PutOperationAdditionalParamsBuilder<TS> => {
  const schemaTupleMap = schema;
  // const schemaTupleMap = new TupleMap("ROOT", schema as any); // @TODO: fix it
  //   const result: PutOperationAdditionalParamsBuilder<GenericTupleTableSchema> = {
  const result = {
    condition: function (builder: ConditionExpressionBuilder<any>): PutOperationAdditionalParamsBuilder<TS> {
      const conditions = runConditionBuilder(builder);

      return putItemAdditionaOperationsFactory(
        schema,
        {
          ...state,
          condition: conditions,
        },
        context,
      );
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
        // console.log(state.item, partitionKey, sortKey);

        if (sortKey) {
          return logicalFactory.and([
            comparisonFactory(partitionKey.key(), "<>", state.item[partitionKey.key()]),
            comparisonFactory(sortKey.key(), "<>", state.item[sortKey.key()]),
          ]);
        }

        return comparisonFactory(partitionKey.key(), "<>", state.item[partitionKey.key()]);
      };

      return putItemAdditionaOperationsFactory(
        schema,
        {
          ...state,
          condition: runConditionBuilder(builder),
        },
        context,
      );
    },
    returnValues: function (value: PutItemReturnValues): PutOperationAdditionalParamsBuilder<TS> {
      return putItemAdditionaOperationsFactory(
        schema,
        {
          ...state,
          returnValues: value,
        },
        context,
      );
    },
    returnConsumedCapacity: function (capacity: ReturnConsumedCapacityValues): PutOperationAdditionalParamsBuilder<TS> {
      return putItemAdditionaOperationsFactory(
        schema,
        {
          ...state,
          returnConsumedCapacity: capacity,
        },
        context,
      );
    },
    returnItemCollectionMetrics: function (
      value: ReturnItemCollectionMetricsValues,
    ): PutOperationAdditionalParamsBuilder<TS> {
      return putItemAdditionaOperationsFactory(
        schema,
        {
          ...state,
          returnItemCollectionMetrics: value,
        },
        context,
      );
    },
    build: function (): PutItemOperationDef {
      const conditionValuesHost: Pick<
        PutItemOperationDef,
        "condition" | "expressionAttributeValues" | "expressionAttributeNames"
      > = {
        condition: null,
        expressionAttributeValues: null,
        expressionAttributeNames: null,
      };

      if (state.condition) {
        const serializationResult = serializeConditionDef(
          state.condition,
          {
            conditionIndex: 0,
          },
          schemaTupleMap,
        );

        conditionValuesHost.condition = serializationResult.condition;
        conditionValuesHost.expressionAttributeValues = serializationResult.valuePlaceholders;
        conditionValuesHost.expressionAttributeNames = serializationResult.attributeNamePlaceholders;
      }

      return {
        type: OperationType.PUT,
        item: transformValueToTypeDescriptor(schema, state.item),
        condition: conditionValuesHost.condition,
        expressionAttributeValues: conditionValuesHost.expressionAttributeValues,
        expressionAttributeNames: conditionValuesHost.expressionAttributeNames,
        returnValues: state.returnValues,
        returnConsumedCapacity: state.returnConsumedCapacity,
        returnItemCollectionMetrics: state.returnItemCollectionMetrics,
      };
    },
    execute: async function () {
      const operationDef = result.build();

      return (await context.runner(context.client, context.tableName, operationDef)) as PutItemCommandOutput;
    },
  };

  return result;
  //   return result satisfies PutOperationAdditionalParamsBuilder<TransformTableSchemaIntoSchemaInterfacesMap<S>>;
  // return result satisfies PutOperationAdditionalParamsBuilder<GenericTupleTableSchema>;
};

export const putItemFacadeFactory = <S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>>(
  // export const putItemFacadeFactory = <S extends GenericTupleTableSchema>(
  schema: S,
  context: OperationContext,
): PutOperationBuilder<
  TransformTableSchemaIntoSchemaInterfacesMap<InferTupledMap<S>>,
  TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>
> => {
  const result = {
    // @TODO: we might put the item object to descriptors transformation here
    item: (name, value) => {
      const schemaFacade = TupleMap.fromTableSchema(extractSchemaBuilderResult(schema) as any); // @TODO: fix it
      const modelSchema = schemaFacade.getByPath<TupleMap>(name);

      if (!modelSchema) {
        throw new Error(`Schema for model ${name} is not found!`);
      }

      return putItemAdditionaOperationsFactory(
        modelSchema.value(),
        {
          // item: transformValueToTypeDescriptor(modelSchema.value(), value),
          item: value,
          condition: null,
          returnValues: null,
          returnConsumedCapacity: null,
          returnItemCollectionMetrics: null,
        },
        context,
      ) as any; //TODO: fix it
    },
  } satisfies PutOperationBuilder<GenericInterfaceTableSchema, GenericTupleBuilderResultSchema>;

  return result as unknown as PutOperationBuilder<
    TransformTableSchemaIntoSchemaInterfacesMap<InferTupledMap<S>>,
    TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>
  >;
};
