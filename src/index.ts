import * as adt from "./adt";
import * as ts from "typescript";
import * as deepEqual from "fast-deep-equal";

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
    } else if (
      tsType.flags &
      (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)
    ) {
      return adt.booleanType;
    } else if (tsType.flags & ts.TypeFlags.Null) {
      return adt.nullType;
    } else if (tsType.flags & ts.TypeFlags.Undefined) {
      return adt.undefinedType;
    } else if (tsType.flags & ts.TypeFlags.Void) {
      return adt.voidType;
    } else if (tsType.flags & ts.TypeFlags.Never) {
      return adt.neverType;
    } else if (tsType.flags & ts.TypeFlags.Any) {
      return adt.anyType;
    } else if (tsType.isStringLiteral()) {
      return adt.stringLiteralType(tsType.value);
    } else if (tsType.isNumberLiteral()) {
      return adt.numberLiteralType(tsType.value);
    } else if (tsType.isUnion()) {
      return adt.unionType(tsType.types.map(ty => this.convert(ty)));
    } else if (tsType.flags & ts.TypeFlags.Object) {
      return this.convertObject(tsType as ts.ObjectType);
    } else if (tsType.isTypeParameter()) {
      return adt.typeParameterType(tsType.symbol.name);
    }
    return this.untranslated(tsType);
  }

  private convertObject(tsType: ts.ObjectType): adt.Type {
    const asNominativeType = this.asNominativeType(tsType);
    if (asNominativeType) {
      return asNominativeType;
    }
    const properties: adt.Property[] = this.checker
      .getPropertiesOfType(tsType)
      .map(prop => {
        const tsType = this.checker.getTypeOfSymbolAtLocation(
          prop,
          prop.valueDeclaration
        );
        const optional = (prop.flags & ts.SymbolFlags.Optional) != 0;
        return {
          name: prop.name,
          optional,
          type: this.convert(tsType)
        };
      });
    const tsSignatures = this.checker.getSignaturesOfType(
      tsType,
      ts.SignatureKind.Call
    );
    let callSignatures: adt.Signature[] | undefined;
    if (tsSignatures.length) {
      callSignatures = tsSignatures.map(sig => this.convertSignature(sig));
      if (callSignatures.length < 10) {
        callSignatures = collapseSignatures(callSignatures);
      }
    }
    return adt.objectType({ properties, callSignatures });
  }

  private untranslated(tsType: ts.Type): adt.UntranslatedType {
    return {
      kind: adt.TypeKind.Untranslated,
      asString: this.checker.typeToString(tsType)
    };
  }

  private convertSignature(tsSignature: ts.Signature): adt.Signature {
    const parameters = tsSignature.parameters.map(parameter => {
      // TODO: Can we distinguish optional parameters here? It's legal to pass
      // `undefined` in place of an optional parameter, but that doesn't show up
      // in tsParamType here.
      const tsParamType = this.checker.getTypeOfSymbolAtLocation(
        parameter,
        parameter.valueDeclaration
      );
      return {
        name: parameter.name,
        type: this.convert(tsParamType)
      };
    });
    const returnType = this.convert(
      this.checker.getReturnTypeOfSignature(tsSignature)
    );
    return {
      parameters,
      returnType
    };
  }

  // If this type has a name that we should use to reference it by, returns the
  // appropriate nominative type.
  private asNominativeType(
    tsType: ts.ObjectType
  ): adt.NominativeType | undefined {
    if (
      !tsType.isClassOrInterface() &&
      !(tsType.objectFlags & ts.ObjectFlags.Reference)
    ) {
      return undefined;
    }
    const symbol = tsType.getSymbol();
    if (!symbol) {
      return undefined;
    }
    const name = symbol.getName();
    const typeArguments = hasTypeArguments(tsType) ? tsType.typeArguments : [];
    return adt.nominativeType(name, typeArguments.map(ty => this.convert(ty)));
  }
}

// Removes duplicate signatures. Signatures are duplicate if they only differ in
// parameter names. NOTE: the algorithm used is O(n^2).
function collapseSignatures(signatures: adt.Signature[]): adt.Signature[] {
  if (signatures.length < 2) {
    return signatures;
  }
  const collapsed = [signatures[0]];
  for (let i = 1; i < signatures.length; i++) {
    if (
      collapsed.every(sig => !signaturesShouldBeCollapsed(sig, signatures[i]))
    ) {
      collapsed.push(signatures[i]);
    }
  }
  return collapsed;
}

// Returns true if the two signatures are identical for our purposes. Two
// signatures are identical if they only differ in parameter names.
function signaturesShouldBeCollapsed(sigA: adt.Signature, sigB: adt.Signature) {
  if (sigA.parameters.length != sigB.parameters.length) {
    return false;
  }
  if (!deepEqual(sigA.returnType, sigB.returnType)) {
    return false;
  }
  for (let i = 0; i < sigA.parameters.length; i++) {
    if (!deepEqual(sigA.parameters[i].type, sigB.parameters[i].type)) {
      return false;
    }
  }
  return true;
}

function hasTypeArguments(
  tsType: ts.Type
): tsType is ts.TypeReference & { typeArguments: ReadonlyArray<ts.Type> } {
  return (tsType as any).typeArguments;
}
