import { AttributeValue, DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PutItemOperationDef } from "../put-item/put-item.types";
import { OperationDefBase, OperationType } from "../operations-common";

type ConvertBuilderResultToCommandParams = PutItemOperationDef;

type ReturnValue<T> = T extends OperationType.PUT ? PutItemCommand : never;

// TODO: write a simple runner that will work with operation builders and submit a request to dynamodb
export const convertBuilderResultToCommandInput = <T extends ConvertBuilderResultToCommandParams>(
  tableName: string,
  builder: T,
): ReturnValue<T> => {
  switch (builder.type) {
    case OperationType.PUT:
      const itemValue = (builder.item as any).M;
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
  }

  throw new Error(`Operation type ${builder.type} not supported`);
};

export const run = (client: DynamoDBClient, tableName: string, operationDef: PutItemOperationDef) => {
  console.log("Running operation: ", JSON.stringify(operationDef, null, 2));

  return client.send(convertBuilderResultToCommandInput(tableName, operationDef));
};
