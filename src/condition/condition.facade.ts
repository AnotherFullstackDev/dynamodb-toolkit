import { TupleMap } from "../schema/schema-tuple-map.facade";
import {
  ComparisonOperatorDefinition,
  ComparisonOperatorFactory,
  ConditionExpressionBuilder,
  EntitySchema,
  KeyConditionExpressionBuilder,
  LogicalOperatorDefinition,
  LogicalOperators,
  OperatorDefinition,
} from "./condition.types";
import { getDescriptorFactoryForValueByPath } from "../schema/type-descriptor-converters/schema-type-descriptors.encoders";
import { TypeDescriptor } from "../schema/type-descriptor-converters/schema-type-descriptors.types";
import { isPartitionKeyAttribute, isSortKeyAttribute } from "../attribute/attribute.matchers";

export const comparisonOperationFactory: ComparisonOperatorFactory<string, Record<string, unknown>, string> = (
  field,
  operator,
  value,
) => ({
  type: "conditional",
  operator: {
    field,
    operator,
    value,
  },
});

export const logicalOperationFactory = (
  operator: LogicalOperators,
  conditions: Array<
    | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>
    | OperatorDefinition<"logical", LogicalOperatorDefinition>
  >,
): OperatorDefinition<"logical", LogicalOperatorDefinition> => ({
  type: "logical",
  operator: {
    operator,
    conditions,
  },
});

const withSuffix = (value: string, additionalSuffix?: string | number) =>
  additionalSuffix === undefined || String(additionalSuffix).trim() === "" ? value : `${value}_${additionalSuffix}`;

const sanitizeAttributePathSegment = (value: string) => value.replace(/[\[\]]/g, "");

export const getAttributeNamePlaceholder = (field: string, suffix?: string | number) => {
  const isNestedPath = field.includes(".");
  if (isNestedPath) {
    const pathParts = field.split(".");
    const pathWithPlaceholders = pathParts.reduce<{ path: string[]; placeholders: Record<string, string> }>(
      (result, item, idx) => {
        // const attributeNamePlaceholder = `#${item}_idx_${idx}_${suffix}`;
        const attributeNamePlaceholder = "#" + withSuffix(sanitizeAttributePathSegment(item), suffix);

        result.path.push(attributeNamePlaceholder);
        result.placeholders[attributeNamePlaceholder] = item;

        return result;
      },
      { path: [], placeholders: {} },
    );

    return {
      attributeNamePlaceholder: pathWithPlaceholders.path.join("."),
      attributeNamePlaceholderValues: pathWithPlaceholders.placeholders,
    };
  }

  // const attributeNamePlaceholder = `#${field}_${suffix}`;
  const attributeNamePlaceholder = "#" + withSuffix(sanitizeAttributePathSegment(field), suffix);
  return {
    attributeNamePlaceholder,
    attributeNamePlaceholderValues: {
      [attributeNamePlaceholder]: field,
    },
  };
};

export const getValuePlaceholderFromAttributeName = (attributeName: string, suffix?: string | number) => {
  const baseValue = `:${sanitizeAttributePathSegment(attributeName).replace(/\./g, "_")}`;

  return withSuffix(baseValue, suffix);
};

// @TODO: an entity schema must be used during serialization to get proper  type descriptors
export const serializeConditionDef = (
  value:
    | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>
    | OperatorDefinition<"logical", LogicalOperatorDefinition>,
  state: { conditionIndex: number } = { conditionIndex: 0 },
  schema: TupleMap,
): {
  condition: string;
  valuePlaceholders: Record<string, unknown>;
  attributeNamePlaceholders: Record<string, string>;
} => {
  if (value.type === "logical") {
    const { conditions, valuePlaceholders, attributeNamePlaceholders } = value.operator.conditions
      .map((value, idx) => {
        const condition = serializeConditionDef(
          value,
          {
            ...state,
            conditionIndex: state.conditionIndex + idx,
          },
          schema,
        );

        return condition;
      })
      .reduce<{
        conditions: string[];
        valuePlaceholders: Record<string, unknown>;
        attributeNamePlaceholders: Record<string, string>;
      }>(
        (result, item) => {
          result.conditions.push(item.condition);
          result.valuePlaceholders = { ...result.valuePlaceholders, ...item.valuePlaceholders };
          result.attributeNamePlaceholders = { ...result.attributeNamePlaceholders, ...item.attributeNamePlaceholders };

          return result;
        },
        { conditions: [], valuePlaceholders: {}, attributeNamePlaceholders: {} },
      );
    // .join(` ${value.operator.operator} `);
    const combinedCondition = conditions.join(` ${value.operator.operator.toUpperCase()} `);

    return {
      condition: `(${combinedCondition})`,
      valuePlaceholders,
      attributeNamePlaceholders,
    };
  }

  if (value.type === "conditional") {
    const { attributeNamePlaceholder, attributeNamePlaceholderValues } = getAttributeNamePlaceholder(
      value.operator.field,
      state.conditionIndex,
    );
    const valueDescriptor = getDescriptorFactoryForValueByPath(schema, value.operator.field);
    // const attributeNamePlaceholder = `#${value.operator.field}_${state.conditionIndex}`;
    // const valuePlaceholder = `:${value.operator.field.replace(".", "_")}_${state.conditionIndex}`;
    const valuePlaceholder = getValuePlaceholderFromAttributeName(value.operator.field, state.conditionIndex);
    const condition = [attributeNamePlaceholder, value.operator.operator, valuePlaceholder].join(" ");

    return {
      condition,
      valuePlaceholders: {
        [valuePlaceholder]: valueDescriptor!(value.operator.value),
      },
      attributeNamePlaceholders: attributeNamePlaceholderValues,
    };
  }

  throw new Error("Unknown operation type");
};

const serializeKeyConditionComparison = (
  value: OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>,
  schema: TupleMap,
) => {
  // console.log(value);
  const valueDescriptor = getDescriptorFactoryForValueByPath(schema, value.operator.field);

  if (!valueDescriptor) {
    throw new Error(`Descriptor not found for field ${value.operator.field}`);
  }

  return {
    [value.operator.field]: valueDescriptor(value.operator.value),
  };
};

export const serializeKeyConditionDef = (
  value:
    | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>
    | OperatorDefinition<"logical", LogicalOperatorDefinition>,
  schema: TupleMap,
): Record<string, TypeDescriptor<string, unknown>> => {
  if (value.type === "logical") {
    if (value.operator.operator !== "and") {
      throw new Error("Only `and` logical operator is supported for key conditions");
    }

    return Object.assign(
      {},
      ...value.operator.conditions.map((value) =>
        serializeKeyConditionComparison(
          value as OperatorDefinition<
            "conditional",
            ComparisonOperatorDefinition<string, string, EntitySchema<string>>
          >,
          schema,
        ),
      ),
    );
  }

  return serializeKeyConditionComparison(
    value as OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>,
    schema,
  );
};

export const validateKeyCondition = (
  serializedCondition: Record<string, TypeDescriptor<string, unknown>>,
  schema: TupleMap,
) => {
  const partitionKey = schema.find((item) => isPartitionKeyAttribute(item.value()));
  const sortKey = schema.find((item) => isSortKeyAttribute(item.value()));

  if (partitionKey && !serializedCondition[partitionKey.key()]) {
    throw new Error(
      "Schema defines a partition key therefore a condition for partition key must be provided when targetting an item by its primary key",
    );
  }

  if (sortKey && !serializedCondition[sortKey.key()]) {
    throw new Error(
      "Schema defines a sort key therefore a condition for sort key must be provided when targeting an item by its primary key",
    );
  }

  return serializedCondition;
};

export const runConditionBuilder = (builder: ConditionExpressionBuilder<any>) => {
  const conditions = builder(comparisonOperationFactory, {
    and: (conditions) => logicalOperationFactory("and", conditions),
    or: (conditions) => logicalOperationFactory("or", conditions),
    not: (conditions) => logicalOperationFactory("not", conditions),
  });

  return conditions;
};

export const runKeyConditionBuilder = (builder: KeyConditionExpressionBuilder<any>) => {
  const conditions = builder(comparisonOperationFactory, {
    and: (conditions) => logicalOperationFactory("and", conditions),
  });

  return conditions;
};

export const serializeProjectionFields = (fields: string[]) => {
  return fields
    .map((fieldName) => getAttributeNamePlaceholder(fieldName, "proj"))
    .reduce<{ attributes: string[]; placeholders: Record<string, string> }>(
      (result, item) => {
        return {
          attributes: [...result.attributes, item.attributeNamePlaceholder],
          placeholders: { ...result.placeholders, ...item.attributeNamePlaceholderValues },
        };
      },
      { attributes: [], placeholders: {} },
    );
};