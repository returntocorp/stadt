// JSON representations of the stadt data types. Each type defined here is the
// JSON version of its corresponding type defined in adt.ts; see that file for
// what individual fields mean.

import * as adt from "./adt";
import { TypeKind } from "./adt";

export type TypeJSON =
  | PrimitiveType
  | NonPrimitiveType
  | UniqueSymbolType
  | LiteralType
  | UnionType
  | IntersectionType
  | UntranslatedType
  | ObjectType
  | NominativeType
  | TypeParameterType
  | TypeofType
  | TupleType;

export interface PrimitiveType {
  kind: adt.PrimitiveKind;
}

export interface NonPrimitiveType {
  kind: TypeKind.NonPrimitive;
}

export interface UniqueSymbolType extends PrimitiveType {
  kind: TypeKind.UniqueSymbol;
  name: string;
}

export interface LiteralType {
  kind: TypeKind.Literal;
  value: string | number;
}

export interface UnionType {
  kind: TypeKind.Union;
  types: TypeJSON[];
}

export interface IntersectionType {
  kind: TypeKind.Intersection;
  types: TypeJSON[];
}

export interface UntranslatedType {
  kind: TypeKind.Untranslated;
  asString: string;
}

export interface ObjectType {
  kind: TypeKind.Object;
  properties: Property[];
  callSignatures: adt.Signature[];
}

export interface NominativeType {
  kind: TypeKind.Nominative;
  name: string;
  fullyQualifiedName: {
    builtin: boolean;
    packageName: string | undefined;
    fileName: string | undefined;
    name: string;
  };
  typeArguments: TypeJSON[];
}

export interface TypeParameterType {
  kind: TypeKind.Parameter;
  name: string;
}

export interface TypeofType {
  kind: TypeKind.Typeof;
  expression: string;
}

export interface TupleType {
  kind: TypeKind.Tuple;
  typeArguments: TypeJSON[];
}

export interface Property {
  name: string;
  optional: boolean;
  type: TypeJSON;
}

export interface Parameter {
  name: string;
  type: TypeJSON;
}

export interface Signature {
  parameters: Parameter[];
  returnType: TypeJSON;
}

export function toJSON(ty: adt.Type): TypeJSON {
  return ty.toJSON();
}

export function fromJSON(typeJSON: TypeJSON): adt.Type {
  switch (typeJSON.kind) {
    case adt.TypeKind.Literal:
      return new adt.LiteralType(typeJSON.value);
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
    case adt.TypeKind.Never:
      return adt.neverType;
    case adt.TypeKind.Any:
      return adt.anyType;
    case adt.TypeKind.NonPrimitive:
      return adt.nonPrimitiveType;
    case adt.TypeKind.Symbol:
      return adt.symbolType;
    case adt.TypeKind.UniqueSymbol:
      return new adt.UniqueSymbolType((typeJSON as UniqueSymbolType).name);
    case adt.TypeKind.Union:
      return new adt.UnionType(typeJSON.types.map(fromJSON));
    case adt.TypeKind.Intersection:
      return new adt.IntersectionType(typeJSON.types.map(fromJSON));
    case adt.TypeKind.Untranslated:
      return new adt.UntranslatedType(typeJSON.asString);
    case adt.TypeKind.Object: {
      const properties = Array.isArray(typeJSON.properties)
        ? typeJSON.properties.map(propertyFromJSON)
        : [];
      const callSignatures = typeJSON.callSignatures
        ? typeJSON.callSignatures.map(signatureFromJSON)
        : undefined;
      return new adt.ObjectType(properties, callSignatures);
    }
    case adt.TypeKind.Nominative: {
      return new adt.NominativeType(
        typeJSON.name,
        typeJSON.fullyQualifiedName,
        typeJSON.typeArguments.map(fromJSON)
      );
    }
    case adt.TypeKind.Parameter: {
      return new adt.TypeParameterType(typeJSON.name);
    }
    case adt.TypeKind.Typeof: {
      return new adt.TypeofType(typeJSON.expression);
    }
    case adt.TypeKind.Tuple: {
      return new adt.TupleType(typeJSON.typeArguments.map(fromJSON));
    }
  }
}

function signatureFromJSON(signatureJSON: any): adt.Signature {
  return {
    parameters: signatureJSON.parameters.map(parameterFromJSON),
    returnType: fromJSON(signatureJSON.returnType)
  };
}

function parameterFromJSON(parameterJSON: any): adt.Parameter {
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
