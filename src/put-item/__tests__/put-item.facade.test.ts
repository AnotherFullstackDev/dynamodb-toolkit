import { partitionKey, string } from "../../attribute/attribute";
import { queryBuilder } from "../../condition/condition.types";
import { schema } from "../../schema/schema.facade";
import { PutItemOperationDef } from "../put-item.types";

describe("General usage of put item operation builder", () => {
  const testSchema = schema().add("name", partitionKey(string())).build();
  const testTable = schema().add("users", testSchema).build();
  const qb = queryBuilder(testTable);

  it("should build a put item builder with an item param", () => {
    const putItemBuilder = qb
      .put()
      .item("users", {
        name: "John Doe",
      })
      .build();

    expect(putItemBuilder).toStrictEqual<PutItemOperationDef>({
      item: { name: "John Doe" },
      condition: null,
      returnValues: null,
      expressionAttributeNames: null,
      expressionAttributeValues: null,
      returnConsumedCapacity: null,
      returnItemCollectionMetrics: null,
    });
  });

  it("should build a put item builder with an item param and a condition", () => {
    const putItemBuilder = qb
      .put()
      .item("users", {
        name: "John Doe",
      })
      .condition((eb) => eb("name", "=", "John Doe"))
      .build();

    expect(putItemBuilder).toStrictEqual<PutItemOperationDef>({
      item: { name: "John Doe" },
      condition: "name = :name_0",
      expressionAttributeValues: { ":name_0": "John Doe" },
      expressionAttributeNames: null,
      returnValues: null,
      returnConsumedCapacity: null,
      returnItemCollectionMetrics: null,
    });
  });
});
