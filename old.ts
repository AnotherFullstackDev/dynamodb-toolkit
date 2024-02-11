import { IndexAttributeValueTypes, PartitionKey, SortKey } from "./query";

type PrimaryKeyAttributes<T> = PickByValue<
  T,
  PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
>;

type NonPrimaryKeyAttributes<T> = OmitByValue<
  T,
  PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
>;
