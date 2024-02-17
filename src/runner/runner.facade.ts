import {
  AttributeValue,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { PutItemOperationDef } from "../put-item/put-item.types";
import { OperationDefBase, OperationType } from "../operations-common";
import { QueryOperationDef } from "../query/query.types";
import { UpdateItemOperationDef } from "../update-item/update-item.types";

export type SupportedOperationDefsByRunner = PutItemOperationDef | QueryOperationDef | UpdateItemOperationDef;

// type ConvertBuilderResultToCommandParams = PutItemOperationDef;

export type ReturnValue<T extends OperationDefBase<OperationType>> = T["type"] extends OperationType.PUT
  ? PutItemCommand
  : T["type"] extends OperationType.QUERY
  ? QueryCommand
  : T["type"] extends OperationType.UPDATE
  ? UpdateItemCommand
  : never;

// TODO: write a simple runner that will work with operation builders and submit a request to dynamodb
export const convertBuilderResultToCommandInput = <T extends SupportedOperationDefsByRunner>(
  tableName: string,
  builder: T,
): ReturnValue<T> => {
  switch (builder.type) {
    case OperationType.PUT:
      const itemValue = (builder.item as any).M; // @TODO: add functionality for extracting the top level object from the serialized state
      return new PutItemCommand({
        TableName: tableName,
        Item: itemValue as Record<string, AttributeValue>,
        ConditionExpression: builder.condition ?? undefined,
        ExpressionAttributeNames: builder.expressionAttributeNames ?? undefined,
        ExpressionAttributeValues: (builder.expressionAttributeValues as Record<string, AttributeValue>) ?? undefined,
        ReturnValues: builder.returnValues ?? undefined,
        ReturnConsumedCapacity: builder.returnConsumedCapacity ?? undefined,
        ReturnItemCollectionMetrics: builder.returnItemCollectionMetrics ?? undefined,
      }) as ReturnValue<T>;

    case OperationType.QUERY:
      return new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: builder.keyCondition,
        ExpressionAttributeNames: builder.expressionAttributeNames ?? undefined,
        ExpressionAttributeValues: (builder.expressionAttributeValues as Record<string, AttributeValue>) ?? undefined,
        FilterExpression: builder.filter ?? undefined,
        ProjectionExpression: builder.projection ?? undefined,
        Limit: builder.limit ?? undefined,
        ReturnConsumedCapacity: builder.returnConsumedCapacity ?? undefined,
      }) as ReturnValue<T>;

    case OperationType.UPDATE:
      return new UpdateItemCommand({
        TableName: tableName,
        Key: builder.key as Record<string, AttributeValue>,
        UpdateExpression: builder.updateExpression,
        ConditionExpression: builder.condition ?? undefined,
        ExpressionAttributeNames: builder.expressionAttributeNames ?? undefined,
        ExpressionAttributeValues: (builder.expressionAttributeValues as Record<string, AttributeValue>) ?? undefined,
        ReturnValues: builder.returnValues ?? undefined,
        ReturnConsumedCapacity: builder.returnConsumedCapacity ?? undefined,
        ReturnItemCollectionMetrics: builder.returnItemCollectionMetrics ?? undefined,
      }) as ReturnValue<T>;
  }

  throw new Error(`Operation type ${builder!.type} not supported`);
};

export const run = (client: DynamoDBClient, tableName: string, operationDef: SupportedOperationDefsByRunner) => {
  console.log("Running operation: ", JSON.stringify(operationDef, null, 2));

  return client.send(convertBuilderResultToCommandInput(tableName, operationDef));
};
