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
  Object = "object"
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
}

export interface CallableType extends ObjectType {
  // A callable type can have multiple signatures if it has overloads. For
  // example, fs.readFileSync returns a Buffer if no encoding is passed, but a
  // string if an encoding is set.
  callSignatures: Signature[];
}

export interface Signature {
  // Could there be any case where we can't find a reasonable name for a
  // parameter?
  parameters: { name: string; type: Type }[];
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

export function isCallable(ty: Type): ty is CallableType {
  return (ty as any).callSignatures !== undefined;
}

export function unionType(types: Type[]): UnionType {
  return {
    kind: TypeKind.Union,
    types
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
  return {
    kind: TypeKind.Object,
    callSignatures: signatures
  };
}
