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
): { condition: string; valuePlaceholders: Record<string, unknown> } => {
  if (value.type === "logical") {
    const { conditions, valuePlaceholders } = value.operator.conditions
      .map((value, idx) => {
        const condition = serializeConditionDef(value, {
          ...state,
          conditionIndex: state.conditionIndex + idx,
        });

        return condition;
      })
      .reduce<{ conditions: string[]; valuePlaceholders: Record<string, unknown> }>(
        (result, item) => {
          result.conditions.push(item.condition);
          result.valuePlaceholders = { ...result.valuePlaceholders, ...item.valuePlaceholders };

          return result;
        },
        { conditions: [], valuePlaceholders: {} },
      );
    // .join(` ${value.operator.operator} `);
    const combinedCondition = conditions.join(` ${value.operator.operator.toUpperCase()} `);

    return {
      condition: `(${combinedCondition})`,
      valuePlaceholders: valuePlaceholders,
    };
  }

  if (value.type === "conditional") {
    const valuePlaceholder = `:${value.operator.field}_${state.conditionIndex}`;
    const condition = [value.operator.field, value.operator.operator, valuePlaceholder].join(" ");

    return {
      condition,
      valuePlaceholders: {
        [valuePlaceholder]: value.operator.value,
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
