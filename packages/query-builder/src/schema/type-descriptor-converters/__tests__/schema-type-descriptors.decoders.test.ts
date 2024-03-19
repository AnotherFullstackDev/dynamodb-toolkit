import { partitionKey, string } from "../../../attribute/attribute";
import { schema } from "../../schema.facade";
import { stringDescriptorFactory } from "../schema-type-descriptors.encoders";
import { transformTypeDescriptorToValue } from "../schema-type-descriptors.decoders";
import { TupleMap } from "../../schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../../schema.builder";

describe("General usage of decoders", () => {
  const entitySchema = schema().add("name", partitionKey(string())).build();
  const tableSchema = schema().add("entity", entitySchema).build();
  const tableMap = TupleMap.fromTableSchema(extractSchemaBuilderResult(tableSchema as any));

  it("should decode an object that is not top level encoded into a type descriptor", () => {
    const value = {
      name: stringDescriptorFactory("John"),
    };

    const result = transformTypeDescriptorToValue(tableMap.get("entity").value() as TupleMap, value);

    expect(result).toEqual({ name: "John" });
  });
});
