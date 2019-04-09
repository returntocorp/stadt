import * as adt from "./adt";
import * as ts from "typescript";

export class Converter {
  private readonly checker: ts.TypeChecker;
  private readonly cache: WeakMap<ts.Type, adt.Type>;
  constructor(checker: ts.TypeChecker) {
    this.checker = checker;
    this.cache = new WeakMap();
  }

  public convert(tsType: ts.Type): adt.Type {
    if (!this.cache.has(tsType)) {
      this.cache.set(tsType, this.convertWithoutCache(tsType));
    }
    return this.cache.get(tsType)!;
  }

  private convertWithoutCache(tsType: ts.Type): adt.Type {
    // Primitive types.
    if (tsType.flags & ts.TypeFlags.String) {
      return adt.stringType;
    } else if (tsType.flags & ts.TypeFlags.Number) {
      return adt.numberType;
    } else if (tsType.flags & ts.TypeFlags.Boolean) {
      return adt.booleanType;
    } else if (tsType.flags & ts.TypeFlags.Null) {
      return adt.nullType;
    } else if (tsType.flags & ts.TypeFlags.Undefined) {
      return adt.undefinedType;
    } else if (tsType.flags & ts.TypeFlags.Void) {
      return adt.voidType;
    } else if (tsType.flags & ts.TypeFlags.Any) {
      return adt.anyType;
    }
    if (tsType.isUnion()) {
      return {
        kind: adt.TypeKind.Union,
        types: tsType.types.map(ty => this.convert(ty))
      } as adt.UnionType;
    }
    return this.untranslated(tsType);
  }

  private untranslated(tsType: ts.Type): adt.UntranslatedType {
    return {
      kind: adt.TypeKind.Untranslated,
      asString: this.checker.typeToString(tsType)
    };
  }
}
