import { Attribute, AttributeType } from "./attribute";

export class AttributeBuilder<T extends AttributeType, V, N extends boolean, O extends boolean>
  implements Attribute<T, V, N, O>
{
  constructor(public attributeType: T, public dataType: V, public isNullable: N, public isOptional: O) {}

  static fromAttribute<T extends AttributeType, V, N extends boolean, O extends boolean>(value: Attribute<T, V, N, O>) {
    return new AttributeBuilder<T, V, N, O>(value.attributeType, value.dataType, value.isNullable, value.isOptional);
  }

  nullable() {
    return new AttributeBuilder(this.attributeType, this.dataType, true, this.isOptional);
  }

  optional() {
    return new AttributeBuilder(this.attributeType, this.dataType, this.isNullable, true);
  }
}
