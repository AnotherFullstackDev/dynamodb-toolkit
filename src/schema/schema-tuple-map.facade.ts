import { TupleKeyValuePeer } from "./schema.types";
import { Attribute, AttributeType, isAttributeOfParticularType } from "../attribute/attribute";

export class TupleKeyValue<K extends string, V> {
  constructor(private tuple: TupleKeyValuePeer<K, V>) {}

  // static isTupleKeyValue(value: unknown): value is TupleKeyValuePeer<string, unknown> {
  //   return Array.isArray(value) && value.length === 2;
  // }

  key(): K {
    return this.tuple[0];
  }

  value(): V {
    return this.tuple[1];
  }
}

type TupleMapType = "ROOT" | "MAP" | "LIST";

export class TupleMap<K extends string = string> {
  private type: TupleMapType;
  private value: TupleKeyValue<K, Attribute<AttributeType, unknown> | TupleMap<string>>[];

  constructor(type: TupleMapType, value: TupleKeyValuePeer<K, Attribute<AttributeType, unknown>>[]) {
    this.type = type;
    this.value = value.map((tuple) => {
      const keyValue = new TupleKeyValue(tuple);
      const value = keyValue.value();

      if (isAttributeOfParticularType(value, AttributeType.MAP)) {
        return new TupleKeyValue([
          keyValue.key(),
          new TupleMap("MAP", value.dataType as TupleKeyValuePeer<string, Attribute<AttributeType, unknown>>[]),
        ]);
      }

      if (isAttributeOfParticularType(value, AttributeType.LIST)) {
        return new TupleKeyValue([
          keyValue.key(),
          new TupleMap("LIST", [["element", value.dataType as Attribute<AttributeType, unknown>]]),
        ]);
      }

      return keyValue;
    });
  }

  getType(): TupleMapType {
    return this.type;
  }

  get(key: string): TupleKeyValue<string, Attribute<AttributeType, unknown> | TupleMap<string>> {
    const tuple = this.value.find((tuple) => tuple.key() === key);

    // TODO: questionable thing
    if (!tuple) {
      throw new Error(`Key ${key} not found`);
    }

    return tuple;
  }

  find(fn: (tuple: TupleKeyValue<string, unknown>) => boolean): TupleKeyValue<string, unknown> | undefined {
    return this.value.find(fn);
  }

  keys(): string[] {
    return this.value.map((tuple) => tuple.key());
  }

  getByPath(path: string): TupleKeyValue<string, Attribute<AttributeType, unknown> | TupleMap<string>> | null {
    const pathSegments = path.split(".");

    let currentValue = new TupleKeyValue<string, Attribute<AttributeType, unknown> | TupleMap<string>>(["root", this]);
    for (const segment of pathSegments) {
      let localValue: TupleMap<string> | TupleKeyValue<string, Attribute<AttributeType, unknown> | TupleMap<string>> =
        currentValue.value() as TupleMap<string>;

      if (!(localValue instanceof TupleMap)) {
        return null;
      }

      // if (localValue.getType() === "LIST") {
      //   localValue = localValue.get("element").value() as TupleMap<string>;
      // }

      // TODO: a validation might be added to report when a list index is skipped or in a wrong format
      // Path segment after the list is skipped because it will reference an index inside a list
      if (localValue.getType() === "LIST") {
        currentValue = localValue.get("element") as TupleKeyValue<string, TupleMap<string>>;
      } else {
        currentValue = localValue.get(segment) as TupleKeyValue<string, TupleMap<string>>;
      }
    }

    return currentValue;
  }
}
