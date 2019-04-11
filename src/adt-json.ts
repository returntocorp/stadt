import * as adt from "./adt";

// Functions for converting ADT types to and from a JSON-encodable type. This is
// mostly just doing things like converting maps to and from a dict of key-value
// pairs. We value human/machine-readability of the representation over
// compactness.

export function toJSON(ty: adt.Type): any {
  if (
    adt.isPrimitive(ty) ||
    ty.kind == adt.TypeKind.Untranslated ||
    ty.kind == adt.TypeKind.Literal
  ) {
    return ty;
  }
  if (adt.isUnion(ty)) {
    return { kind: ty.kind, types: ty.types.map(toJSON) };
  }
  if (adt.isObject(ty)) {
    const obj: any = {
      kind: adt.TypeKind.Object
    };
    if (ty.callSignatures) {
      obj["callSignatures"] = ty.callSignatures.map(signatureToJSON);
    }
    return obj;
  }
  throw new Error(`Unhandled case ${ty.kind}`);
}

function signatureToJSON(sig: adt.Signature) {
  return {
    parameters: sig.parameters.map(parameterToJSON),
    returnType: toJSON(sig.returnType)
  };
}

function parameterToJSON(parameter: adt.Parameter) {
  return {
    name: parameter.name,
    type: toJSON(parameter.type)
  };
}
