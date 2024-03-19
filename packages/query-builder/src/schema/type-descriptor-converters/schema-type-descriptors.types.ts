export type AttributeTypeDescriptorKey = "S" | "N" | "B" | "BOOL" | "NULL" | "M" | "L" | "SS" | "NS" | "BS";

export type TypeDescriptor<K extends string, V> = {
  [key in K]: V;
};

export type StringTypeDescriptor = TypeDescriptor<"S", string>;

export type NumberTypeDescriptor = TypeDescriptor<"N", string>;

export type BinaryTypeDescriptor = TypeDescriptor<"B", ArrayBuffer>;

export type BooleanTypeDescriptor = TypeDescriptor<"BOOL", boolean>;

export type NullTypeDescriptor = TypeDescriptor<"NULL", null>;

export type MapTypeDescriptor = TypeDescriptor<"M", Record<string, unknown>>;

export type ListTypeDescriptor = TypeDescriptor<"L", unknown[]>;

export type StringSetTypeDescriptor = TypeDescriptor<"SS", string[]>;

export type NumberSetTypeDescriptor = TypeDescriptor<"NS", number[]>;

export type BinarySetTypeDescriptor = TypeDescriptor<"BS", ArrayBuffer[]>;

export type TypeDescriptorDecoder = <T>(value: TypeDescriptor<string, T>) => T;
