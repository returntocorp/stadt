import * as adt from "./adt";

// Functions for converting ADT types to and from a JSON-encodable type. This is
// mostly just doing things like converting maps to and from a dict of key-value
// pairs. We value human/machine-readability of the representation over
// compactness.

export function toJSON(ty: adt.Type): any {
  if (
    adt.isPrimitive(ty) ||
    ty.kind == adt.TypeKind.Untranslated ||
    ty.kind == adt.TypeKind.Literal ||
    ty.kind == adt.TypeKind.Nominative ||
    ty.kind == adt.TypeKind.Parameter
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
    if (ty.properties.size != 0) {
      obj["properties"] = [];
      ty.properties.forEach(property =>
        obj["properties"].push(propertyToJSON(property))
      );
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

function propertyToJSON(property: adt.Property): object {
  return {
    name: property.name,
    optional: property.optional,
    type: toJSON(property.type)
  };
}

export function fromJSON(typeJSON: any): adt.Type {
  switch (typeJSON.kind as adt.TypeKind) {
    case adt.TypeKind.Literal:
      return adt.literalType(typeJSON.value);
    case adt.TypeKind.String:
      return adt.stringType;
    case adt.TypeKind.Number:
      return adt.numberType;
    case adt.TypeKind.Boolean:
      return adt.booleanType;
    case adt.TypeKind.Null:
      return adt.nullType;
    case adt.TypeKind.Undefined:
      return adt.undefinedType;
    case adt.TypeKind.Void:
      return adt.voidType;
    case adt.TypeKind.Any:
      return adt.anyType;
    case adt.TypeKind.Union:
      return adt.unionType(typeJSON.types.map(fromJSON));
    case adt.TypeKind.Untranslated:
      return {
        kind: adt.TypeKind.Untranslated,
        asString: typeJSON.asString
      } as adt.UntranslatedType;
    case adt.TypeKind.Object: {
      const properties = (typeJSON.properties || []).map(propertyFromJSON);
      const callSignatures = typeJSON.callSignatures
        ? typeJSON.callSignatures.map(signatureFromJSON)
        : undefined;
      return adt.objectType({
        properties,
        callSignatures
      });
    }
    case adt.TypeKind.Nominative: {
      return {
        kind: adt.TypeKind.Nominative,
        name: typeJSON.name
      } as adt.NominativeType;
    }
    case adt.TypeKind.Parameter: {
      return adt.typeParameterType(typeJSON.name);
    }
  }
}

export function signatureFromJSON(signatureJSON: any): adt.Signature {
  return {
    parameters: signatureJSON.parameters.map(parameterFromJSON),
    returnType: fromJSON(signatureJSON.returnType)
  };
}

export function parameterFromJSON(parameterJSON: any): adt.Parameter {
  return {
    name: parameterJSON.name,
    type: fromJSON(parameterJSON.type)
  };
}

function propertyFromJSON(propertyJSON: any): adt.Property {
  return {
    name: propertyJSON.name,
    optional: propertyJSON.optional,
    type: fromJSON(propertyJSON.type)
  };
}
