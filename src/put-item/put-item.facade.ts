import { AttributeType, isAttributeOfParticularType } from "../attribute/attribute";
import { runConditionBuilder, serializeConditionDef } from "../condition/condition.facade";
import {
  ComparisonOperatorDefinition,
  ConditionExpressionBuilder,
  EntitySchema,
  LogicalOperatorDefinition,
  OperatorDefinition,
} from "../condition/condition.types";
import { OperationType, ReturnConsumedCapacityValues, ReturnItemCommectionMetricsValues } from "../operations-common";
import { TupleKeyValue, TupleMap } from "../schema/schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import {
  InferTupledMap,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
} from "../schema/schema.types";
import { GenericInterfaceTableSchema, GenericTupleBuilderResultSchema } from "../general-test";
import {
  PutItemOperationDef,
  PutItemReturnValues,
  PutOperationAdditionalParamsBuilder,
  PutOperationBuilder,
} from "./put-item.types";
import {
  getDescriptorFactoryForValue,
  transformValueToTypeDescriptor,
} from "../schema/schema-to-type-descriptors.utils";

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

// const putItemAdditionaOperationsFactory = <TS extends GenericTupleBuilderResultSchema>(
const putItemAdditionaOperationsFactory = <TS extends TupleMap>(
  schema: TS,
  state: PutItemStateType,
): PutOperationAdditionalParamsBuilder<TS> => {
  const schemaTupleMap = schema;
  // const schemaTupleMap = new TupleMap("ROOT", schema as any); // @TODO: fix it
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
        // console.log(state.item, partitionKey, sortKey);
        const partitionKyeDescriptorFactory = getDescriptorFactoryForValue(partitionKey.value());

        if (sortKey) {
          const sortKeyDescriptorFactory = getDescriptorFactoryForValue(sortKey.value());
          return logicalFactory.and([
            comparisonFactory(partitionKey.key(), "<>", partitionKyeDescriptorFactory!(state.item[partitionKey.key()])),
            comparisonFactory(sortKey.key(), "<>", sortKeyDescriptorFactory!(state.item[sortKey.key()])),
          ]);
        }

        return comparisonFactory(
          partitionKey.key(),
          "<>",
          partitionKyeDescriptorFactory!(state.item[partitionKey.key()]),
        );
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
        const serializationResult = serializeConditionDef(state.condition, {
          conditionIndex: 0,
        });

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
    item: (name, value) => {
      const schemaFacade = TupleMap.fromTableSchema(extractSchemaBuilderResult(schema) as any); // @TODO: fix it
      const modelSchema = schemaFacade.getByPath<TupleMap>(name);

      if (!modelSchema) {
        throw new Error(`Schema for model ${name} is not found!`);
      }

      return putItemAdditionaOperationsFactory(modelSchema.value(), {
        // item: transformValueToTypeDescriptor(modelSchema.value(), value),
        item: value,
        condition: null,
        returnValues: null,
        returnConsumedCapacity: null,
        returnItemCollectionMetrics: null,
      }) as any; //TODO: fix it
    },
  } satisfies PutOperationBuilder<GenericInterfaceTableSchema, GenericTupleBuilderResultSchema>;

  return result as unknown as PutOperationBuilder<
    TransformTableSchemaIntoSchemaInterfacesMap<InferTupledMap<S>>,
    TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>
  >;
};
