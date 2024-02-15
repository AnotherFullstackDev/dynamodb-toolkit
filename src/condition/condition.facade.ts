import {
  ComparisonOperatorDefinition,
  ComparisonOperatorFactory,
  ConditionExpressionBuilder,
  EntitySchema,
  LogicalOperatorDefinition,
  LogicalOperators,
  OperatorDefinition,
} from "./condition.types";

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

/**
 * Common implementations
 * - transformation of fields into placeholders and aliases
 * - transformation of values into placeholders and aliases
 * - creation of type descriptors for field values
 */

export const serializeConditionDef = (
  value:
    | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>
    | OperatorDefinition<"logical", LogicalOperatorDefinition>,
  state: { conditionIndex: number } = { conditionIndex: 0 },
): {
  condition: string;
  valuePlaceholders: Record<string, unknown>;
  attributeNamePlaceholders: Record<string, string>;
} => {
  if (value.type === "logical") {
    const { conditions, valuePlaceholders, attributeNamePlaceholders } = value.operator.conditions
      .map((value, idx) => {
        const condition = serializeConditionDef(value, {
          ...state,
          conditionIndex: state.conditionIndex + idx,
        });

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
    // @TODO: add working with nested attribute names
    const attributeNamePlaceholder = `#${value.operator.field}_${state.conditionIndex}`;
    const valuePlaceholder = `:${value.operator.field}_${state.conditionIndex}`;
    const condition = [attributeNamePlaceholder, value.operator.operator, valuePlaceholder].join(" ");

    return {
      condition,
      valuePlaceholders: {
        [valuePlaceholder]: value.operator.value,
      },
      attributeNamePlaceholders: {
        [attributeNamePlaceholder]: value.operator.field,
      },
    };
  }

  throw new Error("Unknown operation type");
};

export const runConditionBuilder = (builder: ConditionExpressionBuilder<any>) => {
  const conditions = builder(comparisonOperationFactory, {
    and: (conditions) => logicalOperationFactory("and", conditions),
    or: (conditions) => logicalOperationFactory("or", conditions),
    not: (conditions) => logicalOperationFactory("not", conditions),
  });

  return conditions;
};
