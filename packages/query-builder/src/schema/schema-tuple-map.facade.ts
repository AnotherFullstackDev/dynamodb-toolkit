import { Attribute, AttributeType, Nullable, Optional } from "../attribute/attribute";
import { isAttributeOfParticularType } from "../attribute/attribute.matchers";
import { TupleKeyValuePeer } from "./schema.types";

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

type TupleMapExternalInterfaces = Nullable<boolean> & Optional<boolean>;

export class TupleMap<K extends string = string> implements TupleMapExternalInterfaces {
  private type: TupleMapType;
  private value: TupleKeyValue<K, Attribute<AttributeType, unknown> | TupleMap<string>>[];
  private modifiers: Optional<unknown> & Nullable<unknown>;

  get isNullable(): boolean {
    return Boolean(this.modifiers.isNullable);
  }

  get isOptional(): boolean {
    return Boolean(this.modifiers.isOptional);
  }

  constructor(
    type: TupleMapType,
    value: TupleKeyValuePeer<K, Attribute<AttributeType, unknown>>[],
    modifiers: Optional<unknown> & Nullable<unknown>,
  ) {
    this.type = type;
    this.modifiers = {
      isNullable: modifiers.isNullable,
      isOptional: modifiers.isOptional,
    };
    this.value = value.map((tuple) => {
      const keyValue = new TupleKeyValue(tuple);
      const value = keyValue.value();

      if (isAttributeOfParticularType(value, AttributeType.MAP)) {
        return new TupleKeyValue([
          keyValue.key(),
          new TupleMap("MAP", value.dataType as TupleKeyValuePeer<string, Attribute<AttributeType, unknown>>[], value),
        ]);
      }

      if (isAttributeOfParticularType(value, AttributeType.LIST)) {
        return new TupleKeyValue([
          keyValue.key(),
          new TupleMap("LIST", [["element", value.dataType as Attribute<AttributeType, unknown>]], value),
        ]);
      }

      return keyValue;
    });
  }

  static fromTableSchema<T>(
    tablSchema: TupleKeyValuePeer<string, TupleKeyValuePeer<string, Attribute<AttributeType, unknown>>[]>[],
  ) {
    const tableMap = new TupleMap("ROOT", [], {
      isOptional: false,
      isNullable: false,
    });

    for (const [entityName, entitySchema] of tablSchema) {
      tableMap.set(entityName, new TupleMap("MAP", entitySchema, { isOptional: false, isNullable: false }));
    }

    return tableMap;
  }

  getType(): TupleMapType {
    return this.type;
  }

  has(key: string): boolean {
    return this.value.some((tuple) => tuple.key() === key);
  }

  get(key: string): TupleKeyValue<string, Attribute<AttributeType, unknown> | TupleMap<string>> {
    const tuple = this.value.find((tuple) => tuple.key() === key);

    // TODO: questionable thing
    if (!tuple) {
      throw new Error(`Key ${key} not found`);
    }

    return tuple;
  }

  set(key: K, value: Attribute<AttributeType, unknown> | TupleMap<string>) {
    this.value.push(new TupleKeyValue([key, value]));
  }

  find(fn: (tuple: TupleKeyValue<string, unknown>) => boolean): TupleKeyValue<string, unknown> | undefined {
    return this.value.find(fn);
  }

  keys(): string[] {
    return this.value.map((tuple) => tuple.key());
  }

  forEach(fn: (tuple: TupleKeyValue<string, unknown>, idx?: number) => void) {
    this.value.forEach(fn);
  }

  getByPath<T extends Attribute<AttributeType, unknown> | TupleMap<string>>(
    path: string,
  ): TupleKeyValue<string, T> | null {
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

    return currentValue as TupleKeyValue<string, T>;
  }
}
