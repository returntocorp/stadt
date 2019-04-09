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
  Literal = "literal"
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
