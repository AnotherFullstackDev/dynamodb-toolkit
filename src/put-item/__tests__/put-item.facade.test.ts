import { number, partitionKey, sortKey, string } from "../../attribute/attribute";
import { queryBuilder } from "../../condition/condition.types";
import {
  mapDescriptorFactory,
  numberDescriptorFactory,
  stringDescriptorFactory,
} from "../../schema/schema-to-type-descriptors.utils";
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
      item: mapDescriptorFactory({ name: stringDescriptorFactory("John Doe") }),
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
      item: mapDescriptorFactory({ name: stringDescriptorFactory("John Doe") }),
      condition: "name = :name_0",
      expressionAttributeValues: { ":name_0": "John Doe" },
      expressionAttributeNames: null,
      returnValues: null,
      returnConsumedCapacity: null,
      returnItemCollectionMetrics: null,
    });
  });
});

describe("Conditions building", () => {
  const testSchema = schema().add("name", partitionKey(string())).add("age", sortKey(number())).build();
  const testTable = schema().add("users", testSchema).build();
  const qb = queryBuilder(testTable);

  it("should build a put item builder result with AND logical condition", () => {
    const putItemBuilder = qb
      .put()
      .item("users", {
        name: "John Doe",
        age: 25,
      })
      .condition((eb, { and }) => and([eb("name", "=", "John Doe"), eb("age", ">", 18)]))
      .build();

    expect(putItemBuilder).toStrictEqual<PutItemOperationDef>({
      item: mapDescriptorFactory({ name: stringDescriptorFactory("John Doe"), age: numberDescriptorFactory(25) }),
      condition: "(name = :name_0 AND age > :age_1)",
      expressionAttributeValues: { ":name_0": "John Doe", ":age_1": 18 },
      expressionAttributeNames: null,
      returnValues: null,
      returnConsumedCapacity: null,
      returnItemCollectionMetrics: null,
    });
  });

  it("should build a put item builder result with OR logical condition", () => {
    const putItemBuilder = qb
      .put()
      .item("users", {
        name: "John Doe",
        age: 25,
      })
      .condition((eb, { or }) => or([eb("name", "=", "John Doe"), eb("age", ">", 18)]))
      .build();

    expect(putItemBuilder).toStrictEqual<PutItemOperationDef>({
      item: mapDescriptorFactory({ name: stringDescriptorFactory("John Doe"), age: numberDescriptorFactory(25) }),
      condition: "(name = :name_0 OR age > :age_1)",
      expressionAttributeValues: { ":name_0": "John Doe", ":age_1": 18 },
      expressionAttributeNames: null,
      returnValues: null,
      returnConsumedCapacity: null,
      returnItemCollectionMetrics: null,
    });
  });

  it("should build a put item builder result with NOT logical condition", () => {
    // @TODO: how conditions with NOT operator should be structured?
  });

  it("should build a put item builder result with nested logical conditions", () => {
    const putItemBuilder = qb
      .put()
      .item("users", {
        name: "John Doe",
        age: 25,
      })
      .condition((eb, { and, or }) => and([eb("name", "=", "John Doe"), or([eb("age", ">", 18), eb("age", "<", 30)])]))
      .build();

    expect(putItemBuilder).toStrictEqual<PutItemOperationDef>({
      item: mapDescriptorFactory({ name: stringDescriptorFactory("John Doe"), age: numberDescriptorFactory(25) }),
      condition: "(name = :name_0 AND (age > :age_1 OR age < :age_2))",
      expressionAttributeValues: { ":name_0": "John Doe", ":age_1": 18, ":age_2": 30 },
      expressionAttributeNames: null,
      returnValues: null,
      returnConsumedCapacity: null,
      returnItemCollectionMetrics: null,
    });
  });

  it("should build a put item builder result with nested logical conditions and NOT", () => {});
});
