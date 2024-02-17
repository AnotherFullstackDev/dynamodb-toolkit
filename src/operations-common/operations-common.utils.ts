import { ExpressionPlaceholdersHost } from "./operations-common.types";

const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }

  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  if (typeof value === "object" && Object.keys(value).length === 0) {
    return true;
  }

  return false;
};

export const sanitizePlaceholders = (value: ExpressionPlaceholdersHost): ExpressionPlaceholdersHost => {
  return {
    expressionAttributeNames: isEmpty(value.expressionAttributeNames) ? null : value.expressionAttributeNames,
    expressionAttributeValues: isEmpty(value.expressionAttributeValues) ? null : value.expressionAttributeValues,
  };
};
