export type Attribute<A, T> = { attributeType: A; dataType: T };

export type IndexAttributeValueTypes = string | number | boolean;

export type PartitionKey<T extends IndexAttributeValueTypes> = Attribute<"PARTITION_KEY", T>;

export type SortKey<T extends IndexAttributeValueTypes> = Attribute<"SORT_KEY", T>;

// A tuple attribute can be created based on the list type
// export type ListAttribute<T> = Attribute<"LIST", T[]>;
export type ListAttribute<T> = Attribute<"LIST", T>; // changing type from T[] to T to avoid problems with extracting Attribute value types

export type MapAttribute<T> = Attribute<"MAP", T>;

export type SetAttributeValueTypes = string | number;

// Set attribute can contain string, number and binary types
export type SetAttribute<T extends SetAttributeValueTypes> = Attribute<"SET", T[]>;

export type InferOriginalOrAttributeDataType<T> = T extends Attribute<string, infer U> ? U : T;
