import { Attribute, AttributeType, MapAttribute, bool, date, list, map, number, string } from "../../attribute";
import { TupleKeyValue, TupleMap } from "../schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema.builder";
import { schema } from "../schema.facade";
import { TupleKeyValuePeer, TupleMapBuilderResult } from "../schema.types";

describe("General building of a tuple map", () => {
  it("should build a tuple map from manually passed data", () => {
    const tupleMap = new TupleMap("ROOT", [
      ["a", number()],
      ["b", string()],
      ["c", bool()],
      [
        "d",
        {
          attributeType: AttributeType.MAP,
          dataType: [
            ["e", date()],
            ["f", number()],
          ],
        },
      ],
    ]);

    expect(tupleMap.get("a")).toStrictEqual(new TupleKeyValue(["a", number()]));
    expect(tupleMap.get("b")).toStrictEqual(new TupleKeyValue(["b", string()]));
    expect(tupleMap.get("c")).toStrictEqual(new TupleKeyValue(["c", bool()]));
    expect(tupleMap.get("d").value()).toBeInstanceOf(TupleMap);
    expect(tupleMap.get("d").value()).toStrictEqual(
      new TupleMap("MAP", [
        ["e", date()],
        ["f", number()],
      ]),
    );
    expect(tupleMap.keys().length).toBe(4);
  });

  it("should build a tuple map from a nested schema builder result", () => {
    const testSchema = schema()
      .add("field", string())
      .add("number_field", number())
      .add("map", map(schema().add("nested_field", date()).build()))
      .build();
    // console.log(testSchema);
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    expect(tupleMap.get("field")).toBeInstanceOf(TupleKeyValue);
    expect(tupleMap.get("field").value()).toStrictEqual(string());

    expect(tupleMap.get("number_field")).toBeInstanceOf(TupleKeyValue);
    expect(tupleMap.get("number_field").value()).toStrictEqual(number());

    // const expectedMapValue: MapAttribute<any> = {
    //   attributeType: AttributeType.MAP,
    //   dataType: new TupleMap("MAP", [["nested_field", date()]]),
    // };
    expect(tupleMap.get("map")).toBeInstanceOf(TupleKeyValue);
    expect(tupleMap.get("map").value()).toStrictEqual(new TupleMap("MAP", [["nested_field", date()]]));
  });

  it("should build a tuple map from a nested schema builder result with a list", () => {
    const testSchema = schema()
      .add("field", string())
      .add("number_field", number())
      .add("list", list(map(schema().add("nested_field", date()).build())))
      .build();

    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    expect(tupleMap.get("field")).toBeInstanceOf(TupleKeyValue);
    expect(tupleMap.get("field").value()).toStrictEqual(string());

    expect(tupleMap.get("number_field")).toBeInstanceOf(TupleKeyValue);
    expect(tupleMap.get("number_field").value()).toStrictEqual(number());

    const listObj = tupleMap.get("list");
    const testMapValue: MapAttribute<any> = {
      attributeType: AttributeType.MAP,
      dataType: [["nested_field", date()]],
    };
    expect(listObj).toBeInstanceOf(TupleKeyValue);
    expect(listObj.value()).toStrictEqual(new TupleMap("LIST", [["element", testMapValue]]));

    expect((listObj.value() as unknown as TupleMap<string>).get("element")).toBeInstanceOf(TupleKeyValue);
    expect((listObj.value() as unknown as TupleMap<string>).get("element").value()).toStrictEqual(
      new TupleMap("MAP", [["nested_field", date()]]),
    );
  });
});

describe("Getting values", () => {
  let testSchema: TupleMapBuilderResult<any, any>;

  beforeEach(() => {
    testSchema = schema()
      .add("field", string())
      .add("number_field", number())
      .add("map", map(schema().add("nested_field", date()).build()))
      .add("list", list(map(schema().add("nested_field", bool()).build())))
      .build();
  });

  it("should get a top-level value from a tuple map", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const value = tupleMap.getByPath("field");
    expect(value).not.toBeNull();
    expect(value).toBeInstanceOf(TupleKeyValue);
    expect(value!.value()).toStrictEqual(string());
  });

  it("should get a nested map from a tuple map", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const value = tupleMap.getByPath("map");

    expect(value).not.toBeNull();

    const innerValue = value!.value() as TupleMap<string>;

    expect(value).toBeInstanceOf(TupleKeyValue);
    expect(innerValue.getType()).toBe("MAP");
    expect(value!.value()).toStrictEqual(new TupleMap("MAP", [["nested_field", date()]]));
  });

  it("should get a nested list from a tuple map", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const value = tupleMap.getByPath("list");

    expect(value).not.toBeNull();

    const innerValue = value!.value() as TupleMap<string>;
    expect(value).toBeInstanceOf(TupleKeyValue);
    expect(innerValue.getType()).toBe("LIST");
    expect(value!.value()).toStrictEqual(
      new TupleMap("LIST", [["element", { attributeType: AttributeType.MAP, dataType: [["nested_field", bool()]] }]]),
    );
  });

  it("should get a nested field from a map in a tuple map", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const value = tupleMap.getByPath("map.nested_field");

    expect(value).not.toBeNull();
    expect(value).toBeInstanceOf(TupleKeyValue);
    expect(value!.value()).toStrictEqual(date());
  });

  it("should get a nested field from a list in a tuple map", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const value = tupleMap.getByPath("list.nested_field");

    expect(value).not.toBeNull();
    expect(value).toBeInstanceOf(TupleKeyValue);
    expect(value!.value()).toStrictEqual(bool());
  });

  it("should get a nested field from a preselected map", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const map = tupleMap.getByPath("map") as TupleKeyValue<string, TupleMap<string>>;
    const value = map.value().getByPath("nested_field");

    expect(value).not.toBeNull();
    expect(value).toBeInstanceOf(TupleKeyValue);
    expect(value!.value()).toStrictEqual(date());
  });

  it("should get a nested field from a map inside a list", () => {
    const tupleMap = new TupleMap("ROOT", extractSchemaBuilderResult(testSchema));

    const list = tupleMap.getByPath("list") as TupleKeyValue<string, TupleMap<string>>;
    const value = list.value().getByPath("nested_field");

    expect(value).not.toBeNull();
    expect(value).toBeInstanceOf(TupleKeyValue);
    expect(value!.value()).toStrictEqual(bool());
  });
});
