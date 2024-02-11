export type PreventEmptyObject<T> = keyof T extends never ? never : T;

export type PickByValue<T, ValueType> = PreventEmptyObject<
  Omit<T, { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]>
>;

export type OmitByValue<T, ValueType> = PreventEmptyObject<
  Omit<T, { [Key in keyof T]: T[Key] extends ValueType ? Key : never }[keyof T]>
>;

export type SingleOrArray<T> = T | T[];
