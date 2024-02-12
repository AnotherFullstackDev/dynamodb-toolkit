export type PreventEmptyObject<T> = keyof T extends never ? never : T;

export type PickByValue<T, ValueType> = PreventEmptyObject<
  Omit<T, { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]>
>;

export type OmitByValue<T, ValueType> = PreventEmptyObject<
  Omit<T, { [Key in keyof T]: T[Key] extends ValueType ? Key : never }[keyof T]>
>;

export type SingleOrArray<T> = T | T[];

export type DeepPartial<T> = T extends object
  ? T extends Date
    ? T
    : {
        [P in keyof T]?: T[P] extends Array<infer U>
          ? Array<DeepPartial<U>>
          : T[P] extends ReadonlyArray<infer U>
          ? ReadonlyArray<DeepPartial<U>>
          : DeepPartial<T[P]>;
      }
  : T;

export type CombineArrayElementsViaUnion<T> = T extends [infer E, ...infer R]
  ? E | CombineArrayElementsViaUnion<R>
  : never;

export type ConcatenateArrays<T, A> = [...(T extends [...infer U] ? U : [T]), ...(A extends [...infer AE] ? AE : [A])];

export type RemapRecord<R> = { [K in keyof R]: R[K] };

export type ScalarTypes = string | number | boolean | bigint | null | undefined;
