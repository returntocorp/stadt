import * as ts from "typescript";

export interface Type {
  kind: TypeKind;
}

export enum TypeKind {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Null = "null",
  Undefined = "undefined",
  Void = "void",
  Any = "any",
  Union = "union",
  Untranslated = "untranslated",
  Literal = "literal",
  // This also includes functions/anything callable, since in JavaScript those
  // are objects.
  Object = "object",
  // This is a type that's just a name. Objects constructed via `new Foo()` will
  // have nominative types.
  Nominative = "nominative",
  Parameter = "parameter"
}

// Non-object types that are built in to the JavaScript language (or to our type
// system).
export interface PrimitiveType extends Type {
  // `void` is the bottom type, the return type of functions that never return.
  // `void` is a subtype of all types.
  //
  // `any` is the top type; all types are subtypes of it.
  kind:
    | TypeKind.String
    | TypeKind.Number
    | TypeKind.Boolean
    | TypeKind.Null
    | TypeKind.Undefined
    | TypeKind.Void
    | TypeKind.Any;
}

// Represents the type of a string/numeric/boolean literal.
export interface LiteralType extends Type {
  kind: TypeKind.Literal;
  // TODO: boolean? It's a bit weird because TypeScript seems to define it as a
  // union of `false | true`.
  value: string | number;
}

// This type represents one of the given types.
export interface UnionType extends Type {
  kind: TypeKind.Union;
  types: Type[];
}

// A type that stadt didn't know how to translate.
export interface UntranslatedType extends Type {
  kind: TypeKind.Untranslated;
  // TypeScript's representation of this type. Not machine-readable, just useful
  // for debugging.
  asString: string;
}

export interface ObjectType extends Type {
  kind: TypeKind.Object;
  properties: Map<string, Property>;
  /// A callable type can have multiple signatures if it has overloads. For
  /// example, fs.readFileSync returns a Buffer if no encoding is passed, but a
  /// string if an encoding is set.
  callSignatures?: Signature[];
}

export interface NominativeType extends Type {
  kind: TypeKind.Nominative;
  // Human-readable name. This is not fully-qualified, so it's not guaranteed to
  // be unique.
  name: string;
  typeArguments: Type[];
}

// A type parameter is a parameter such as K or V that shows up in the
// *definition* of a generic type.
export interface TypeParameterType {
  kind: TypeKind.Parameter;
  name: string;
}

export interface Property {
  name: string;
  optional: boolean;
  // If a property is optional, then the type indicates the type of the
  // property's value, including `undefined`. It's possible to have a property
  // whose type includes `undefined` *and* whose value is optional, meaning both
  // {x: undefined} and {} are legal and could potentially have different
  // semantics to the program. It's probably a bad idea, but it's valid.
  type: Type;
}

export interface CallableType extends ObjectType {
  callSignatures: Signature[];
}

export interface Parameter {
  name: string;
  type: Type;
}

export interface Signature {
  parameters: Parameter[];
  // Functions that don't return have voidType return type.
  returnType: Type;
}

export const stringType: PrimitiveType = {
  kind: TypeKind.String
};
export const numberType: PrimitiveType = {
  kind: TypeKind.Number
};
export const booleanType: PrimitiveType = {
  kind: TypeKind.Boolean
};
export const nullType: PrimitiveType = {
  kind: TypeKind.Null
};
export const undefinedType: PrimitiveType = {
  kind: TypeKind.Undefined
};
export const voidType: PrimitiveType = {
  kind: TypeKind.Void
};
export const anyType: PrimitiveType = {
  kind: TypeKind.Any
};

export function isPrimitive(ty: Type): ty is PrimitiveType {
  return (
    ty.kind === TypeKind.String ||
    ty.kind === TypeKind.Number ||
    ty.kind === TypeKind.Boolean ||
    ty.kind === TypeKind.Null ||
    ty.kind === TypeKind.Undefined ||
    ty.kind === TypeKind.Void ||
    ty.kind === TypeKind.Any
  );
}

export function isObject(ty: Type): ty is ObjectType {
  return ty.kind === TypeKind.Object;
}

export function isUnion(ty: Type): ty is UnionType {
  return ty.kind === TypeKind.Union;
}

export function isCallable(ty: Type): ty is CallableType {
  return isObject(ty) && ty.callSignatures !== undefined;
}

export function objectType(opts: {
  properties?: Property[];
  callSignatures?: Signature[];
}): ObjectType {
  const propertyMap = new Map<string, Property>();
  for (const property of opts.properties || []) {
    propertyMap.set(property.name, property);
  }
  return {
    kind: TypeKind.Object,
    properties: propertyMap,
    callSignatures: opts.callSignatures
  };
}

export function unionType(types: Type[]): UnionType {
  return {
    kind: TypeKind.Union,
    types
  };
}

export function literalType(value: string | number): LiteralType {
  return {
    kind: TypeKind.Literal,
    value
  };
}

export function stringLiteralType(value: string): LiteralType {
  return {
    kind: TypeKind.Literal,
    value
  };
}

export function numberLiteralType(value: number): LiteralType {
  return {
    kind: TypeKind.Literal,
    value
  };
}

export function functionType(signatures: Signature[]): CallableType {
  return objectType({
    callSignatures: signatures
  }) as CallableType;
}

export function nominativeType(
  name: string,
  typeArguments: Type[] = []
): NominativeType {
  return {
    kind: TypeKind.Nominative,
    name,
    typeArguments
  };
}

export function typeParameterType(name: string): TypeParameterType {
  return {
    kind: TypeKind.Parameter,
    name
  };
}
