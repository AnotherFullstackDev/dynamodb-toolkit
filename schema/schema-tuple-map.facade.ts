import { TupleKeyValuePeer } from "./schema.types";

export class TupleKeyValue<K extends string, V> {
  constructor(private tuple: TupleKeyValuePeer<K, V>) {}

  static isTupleKeyValue(value: unknown): value is TupleKeyValuePeer<string, unknown> {
    return Array.isArray(value) && value.length === 2;
  }

  key(): K {
    return this.tuple[0];
  }

  value(): V {
    return this.tuple[1];
  }
}

export class TupleMap {
  private value: TupleKeyValue<string, unknown>[];

  constructor(value: TupleKeyValuePeer<string, unknown>[]) {
    this.value = value.map((tuple) => {
      const keyValue = new TupleKeyValue(tuple);
      const value = keyValue.value();

      if (Array.isArray(value)) {
        return new TupleKeyValue([keyValue.key(), new TupleMap(value)]);
      }

      return keyValue;
    });
  }

  get(key: string): TupleKeyValue<string, unknown> {
    const tuple = this.value.find((tuple) => tuple.key() === key);

    if (!tuple) {
      throw new Error(`Key ${key} not found`);
    }

    return tuple;
  }

  find(fn: (tuple: TupleKeyValue<string, unknown>) => boolean): TupleKeyValue<string, unknown> | undefined {
    return this.value.find(fn);
  }
}
