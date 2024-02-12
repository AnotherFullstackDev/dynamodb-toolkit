import {
  ComparisonFunctions,
  ComparisonOperatorDefinition,
  ComparisonOperatorFactory,
  ComparisonOperators,
  ConditionExpressionBuilder,
  EntitySchema,
  LogicalOperatorDefinition,
  LogicalOperatorFactory,
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

export const serializeConditionDef = (
  value:
    | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>
    | OperatorDefinition<"logical", LogicalOperatorDefinition>,
) => {
  if (value.type === "logical") {
    const combinedCondition: string = value.operator.conditions
      .map((value) => {
        const condition = serializeConditionDef(value);

        return condition;
      })
      .join(` ${value.operator.operator} `);

    return `(${combinedCondition})`;
  }

  if (value.type === "conditional") {
    return [value.operator.field, value.operator.operator, value.operator.value].join(" ");
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
