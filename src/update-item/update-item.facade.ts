import { UpdateItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { PartitionKey, SortKey } from "../attribute/attribute";
import {
  getAttributeNamePlaceholder,
  getValuePlaceholderFromAttrinuteName,
  runConditionBuilder,
  runKeyConditionBuilder,
  serializeConditionDef,
  serializeKeyConditionDef,
  validateKeyCondition,
} from "../condition/condition.facade";
import { ConditionExpressionBuilder, KeyConditionExpressionBuilder } from "../condition/condition.types";
import { GenericTupleBuilderResultSchema, GenericTupleTableSchema } from "../general-test";
import {
  InferProjectionFieldsFromSchemas,
  OperationContext,
  OperationType,
  ReturnConsumedCapacityValues,
  ReturnItemCommectionMetricsValues,
} from "../operations-common";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import {
  InferTupledMap,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  RemoveTableSchemaFieldsByType,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
} from "../schema/schema.types";
import {
  FieldUpdateOperation,
  SetOperationDefFactory,
  SetValuesBuilder,
  UpdateIndividualItemOperationBuilder,
  UpdateItemOperationBuilderState,
  UpdateItemOperationDef,
  UpdateItemReturnValues,
  UpdateOperationBuilder,
} from "./update-item.types";
import { isFieldUpdateOperationDef } from "./update-item.utils";
import { getDescriptorFactoryForValueByPath } from "../schema/type-descriptor-converters/schema-type-descriptors.encoders";
import { transformTypeDescriptorToValue } from "../schema/type-descriptor-converters/schema-type-descriptors.decoders";

export const updateIndividualItemOperationBuilderFactory = <S>(
  schema: TupleMap,
  state: UpdateItemOperationBuilderState,
  context: OperationContext,
): UpdateIndividualItemOperationBuilder<S> => {
  const result: UpdateIndividualItemOperationBuilder<S> = {
    key: function (
      builder: KeyConditionExpressionBuilder<
        PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<TransformTableSchemaIntoTupleSchemasMap<S>>
      >,
    ): UpdateIndividualItemOperationBuilder<S> {
      const condition = runKeyConditionBuilder(builder);

      return updateIndividualItemOperationBuilderFactory(schema, { ...state, key: condition }, context);
    },
    set: function (
      value: // | SetItemValue<TransformTableSchemaIntoSchemaInterfacesMap<S>, TransformTableSchemaIntoTupleSchemasMap<S>>
      SetValuesBuilder<any>,
    ): UpdateIndividualItemOperationBuilder<S> {
      const setOperationDefFactory: SetOperationDefFactory<string, unknown> = (field, value) => ({
        field,
        operation: isFieldUpdateOperationDef(value) ? value : { operationName: FieldUpdateOperation.SET, value },
      });

      const builderResult = value(setOperationDefFactory as any); // TODO: fix it

      const setFieldStatements = [];
      let attributePlaceholders: Record<string, string> = {};
      let valuePlaceholders: Record<string, unknown> = {};

      for (const operationDef of builderResult) {
        // @TODO: with values serialization there is possible a colision when fields defined in different nested object will have the same name
        // But that should not be a problem because the field placeholder just reflects its name
        const fieldPlaceholder = getAttributeNamePlaceholder(operationDef.field, "");
        const valuePlaceholder = getValuePlaceholderFromAttrinuteName(operationDef.field);
        const valueDescriptor = getDescriptorFactoryForValueByPath(schema, operationDef.field);

        if (!valueDescriptor) {
          throw new Error(`Descriptor not found for field ${operationDef.field}`);
        }

        let statement = null;

        switch (operationDef.operation.operationName) {
          case FieldUpdateOperation.APPEND_LIST:
            statement = `${fieldPlaceholder.attributeNamePlaceholder} = list_append(${fieldPlaceholder.attributeNamePlaceholder}, ${valuePlaceholder})`;
            break;

          case FieldUpdateOperation.ATOMIC_INCREMENT:
            statement = `${fieldPlaceholder.attributeNamePlaceholder} + ${valuePlaceholder}`;
            break;

          case FieldUpdateOperation.ATOMIC_DECREMENT:
            statement = `${fieldPlaceholder.attributeNamePlaceholder} - ${valuePlaceholder}`;

          default:
            statement = `${fieldPlaceholder.attributeNamePlaceholder} = ${valuePlaceholder}`;
        }

        if (!statement) {
          throw new Error(`Statement for operation ${operationDef.operation.operationName} was not created!`);
        }

        setFieldStatements.push(statement);
        attributePlaceholders = { ...attributePlaceholders, ...fieldPlaceholder.attributeNamePlaceholderValues };
        valuePlaceholders = {
          ...valuePlaceholders,
          [valuePlaceholder]: valueDescriptor(operationDef.operation.value),
        };
      }

      return updateIndividualItemOperationBuilderFactory(
        schema,
        {
          ...state,
          set: {
            statements: setFieldStatements,
            attributePlaceholders,
            valuePlaceholders,
          },
        },
        context,
      );
    },
    remove: function (
      fields: InferProjectionFieldsFromSchemas<
        RemoveTableSchemaFieldsByType<TransformTableSchemaIntoTupleSchemasMap<S>, [PartitionKey<any>, SortKey<any>]>
      >,
    ): UpdateIndividualItemOperationBuilder<S> {
      const attributes = [];
      let attributePlaceholders = {};

      for (const field of fields as string[]) {
        const fieldPlaceholder = getAttributeNamePlaceholder(field, "remove");

        attributes.push(fieldPlaceholder.attributeNamePlaceholder);
        attributePlaceholders = { ...attributePlaceholders, ...fieldPlaceholder.attributeNamePlaceholderValues };
      }

      return updateIndividualItemOperationBuilderFactory(
        schema,
        {
          ...state,
          remove: {
            attributes,
            attributePlaceholders,
          },
        },
        context,
      );
    },
    condition: function (builder: ConditionExpressionBuilder<any>): UpdateIndividualItemOperationBuilder<S> {
      const condition = runConditionBuilder(builder);

      return updateIndividualItemOperationBuilderFactory(schema, { ...state, condition }, context);
    },
    returnValues: function (value: UpdateItemReturnValues): UpdateIndividualItemOperationBuilder<S> {
      return updateIndividualItemOperationBuilderFactory(schema, { ...state, returnValues: value }, context);
    },
    returnConsumedCapacity: function (capacity: ReturnConsumedCapacityValues): UpdateIndividualItemOperationBuilder<S> {
      return updateIndividualItemOperationBuilderFactory(
        schema,
        { ...state, returnConsumedCapacity: capacity },
        context,
      );
    },
    returnItemCollectionMetrics: function (
      value: ReturnItemCommectionMetricsValues,
    ): UpdateIndividualItemOperationBuilder<S> {
      return updateIndividualItemOperationBuilderFactory(
        schema,
        { ...state, returnItemCollectionMetrics: value },
        context,
      );
    },
    build: function (): UpdateItemOperationDef {
      if (!state.key) {
        throw new Error("Key condition is not defined");
      }

      const serializedKeyCondition = validateKeyCondition(serializeKeyConditionDef(state.key, schema), schema);
      const serializedCondition = state.condition
        ? serializeConditionDef(state.condition, { conditionIndex: 0 }, schema)
        : null;
      const serializedSetStatements = state.set.statements.length ? `SET ${state.set.statements.join(", ")}` : "";
      const serializedRemoveStatements = state.remove.attributes.length
        ? `REMOVE ${state.remove.attributes.join(", ")}`
        : "";
      const updateExpression = [serializedSetStatements, serializedRemoveStatements].filter((x) => x).join(" ");

      return {
        type: OperationType.UPDATE,
        key: serializedKeyCondition,
        condition: serializedCondition?.condition ?? null,
        updateExpression: updateExpression,
        expressionAttributeNames: {
          ...state.set.attributePlaceholders,
          ...state.remove.attributePlaceholders,
          ...serializedCondition?.attributeNamePlaceholders,
        },
        expressionAttributeValues: {
          ...state.set.valuePlaceholders,
          ...serializedCondition?.valuePlaceholders,
        },
        returnValues: state.returnValues,
        returnConsumedCapacity: state.returnConsumedCapacity,
        returnItemCollectionMetrics: state.returnItemCollectionMetrics,
      };
    },
    execute: function (): Promise<UpdateItemCommandOutput> {
      const operationDef = this.build();

      return context.runner(context.client, context.tableName, operationDef) as Promise<UpdateItemCommandOutput>;
    },
    executeAndReturnValue: async function <T = unknown>(): Promise<T | null> {
      const commandResult = await this.execute();

      return commandResult.Attributes ? (transformTypeDescriptorToValue(schema, commandResult.Attributes) as T) : null;
    },
  };

  return result;
};

export const updateItemFacadeFactory = <S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>>(
  schema: S,
  context: OperationContext,
): UpdateOperationBuilder<InferTupledMap<S>> => {
  const tableSchema = TupleMap.fromTableSchema(extractSchemaBuilderResult(schema as any)); // TODO: fix any
  const result: UpdateOperationBuilder<InferTupledMap<S>> = {
    item: (name: string) => {
      const entitySchema = tableSchema.get(name);

      if (!entitySchema) {
        throw new Error(`Entity ${name} not found in schema`);
      }

      return updateIndividualItemOperationBuilderFactory(
        entitySchema.value() as TupleMap,
        {
          key: null,
          set: {
            statements: [],
            attributePlaceholders: {},
            valuePlaceholders: {},
          },
          remove: {
            attributes: [],
            attributePlaceholders: {},
          },
          condition: null,
          returnValues: null,
          returnConsumedCapacity: null,
          returnItemCollectionMetrics: null,
        },
        context,
      );
    },
  } as unknown as UpdateOperationBuilder<InferTupledMap<S>>;

  return result;
};
