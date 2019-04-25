import * as assert from "assert";

export enum TypeKind {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Null = "null",
  Undefined = "undefined",
  Void = "void",
  Never = "never",
  Any = "any",
  Union = "union",
  // Symbol is the generic type that all symbols share; UniqueSymbol is specific
  // to each individual symbol instance.
  Symbol = "symbol",
  UniqueSymbol = "UniqueSymbol",
  Intersection = "intersection",
  Untranslated = "untranslated",
  Literal = "literal",
  Object = "object",
  NonPrimitive = "nonprimitive",
  // This is a type that's just a name. Objects constructed via `new Foo()` will
  // have nominative types.
  Nominative = "nominative",
  Parameter = "parameter",
  Typeof = "typeof",
  Tuple = "tuple"
}

export abstract class Type {
  abstract kind: TypeKind;
  isPrimitive(): this is PrimitiveType {
    return (
      this.kind === TypeKind.String ||
      this.kind === TypeKind.Number ||
      this.kind === TypeKind.Boolean ||
      this.kind === TypeKind.Symbol ||
      this.kind === TypeKind.UniqueSymbol ||
      this.kind === TypeKind.Null ||
      this.kind === TypeKind.Undefined ||
      this.kind === TypeKind.Void ||
      this.kind === TypeKind.Never ||
      this.kind === TypeKind.Any
    );
  }
  isObject(): this is ObjectType {
    return this.kind === TypeKind.Object;
  }
  isTypeof(): this is TypeofType {
    return this.kind === TypeKind.Typeof;
  }
  isUnion(): this is UnionType {
    return this.kind === TypeKind.Union;
  }
  isIntersection(): this is UnionType {
    return this.kind === TypeKind.Intersection;
  }
  isNominative(): this is NominativeType {
    return this.kind === TypeKind.Nominative;
  }
  isTuple(): this is TupleType {
    return this.kind === TypeKind.Tuple;
  }
  isUniqueSymbol(): this is UniqueSymbolType {
    return this.kind === TypeKind.UniqueSymbol;
  }
}

// Non-object types that are built in to the JavaScript language (or to our type
// system). Instead of constructing new values of this type, use the
// already-defined ones: anyType, stringType, etc.
export class PrimitiveType extends Type {
  kind: PrimitiveKind;
  constructor(kind: PrimitiveKind) {
    super();
    this.kind = kind;
  }
}

// Each Symbol object has its own unique type. No two Symbols will share the
// same unique type, even if they're created with the same description.
export class UniqueSymbolType extends PrimitiveType {
  kind = TypeKind.UniqueSymbol as PrimitiveKind;
  name: string;
  constructor(name: string) {
    super(TypeKind.UniqueSymbol);
    this.name = name;
  }
}

// This type represents any value that isn't a primitive (number, string,
// boolean, symbol, null, or undefined). Typescript calls it `object` (note the
// lowercase o), but that's confusing since Typescript also has `Object`, which
// includes primitives.
export class NonPrimitiveType extends Type {
  kind = TypeKind.NonPrimitive;
}

// A function whose return value is irrelevant can be said to return `void`.
// Since void is a subtype of all types, functions that take a callback whose
// return value is irrelevant will typically take a function returning `void`.
// It is an error to assign the return value of such a function to a variable.
//
// Conversely, `any` is a supertype of all types and effectively disables
// typechecking.
//
// `never` is the type of functions that never return, either because they loop
// or because they do abnormal things to control flow. It's mostly used for
// things like `process.exit` and `assert.fail`.
type PrimitiveKind =
  | TypeKind.String
  | TypeKind.Number
  | TypeKind.Boolean
  | TypeKind.Symbol
  | TypeKind.UniqueSymbol
  | TypeKind.Null
  | TypeKind.Undefined
  | TypeKind.Void
  | TypeKind.Never
  | TypeKind.Any;

// Represents the type of a string/numeric literal. For example,
// HTMLMediaElement.canPlayType has return type `"probably" | "maybe" | ""`,
// meaning it returns one of those three strings.
export class LiteralType extends Type {
  kind = TypeKind.Literal;
  // TODO: boolean? It's a bit weird because TypeScript seems to define it as a
  // union of `false | true`.
  value: string | number;
  constructor(value: string | number) {
    super();
    this.value = value;
  }
}

// A union type includes all values in any of its constituent types.
export class UnionType extends Type {
  kind = TypeKind.Union;
  types: Type[];
  constructor(types: Type[]) {
    super();
    this.types = types;
  }
}

// An intersection type includes all values that are in *all* of its types. For
// example, the type `{a: number} & {b: string}` includes values like `{a: 3, b:
// "hi"}` but not `{a: number}`.
export class IntersectionType extends Type {
  kind = TypeKind.Intersection;
  types: Type[];
  constructor(types: Type[]) {
    super();
    this.types = types;
  }
}

// A type that stadt didn't know how to translate.
export class UntranslatedType extends Type {
  kind = TypeKind.Untranslated;
  // TypeScript's representation of this type. Not machine-readable, just useful
  // for debugging.
  asString: string;
  constructor(asString: string) {
    super();
    this.asString = asString;
  }
}

// Used to serialize a type that doesn't represent a class or interface. also
// used to output the definitions of classes/interfaces.
export class ObjectType extends Type {
  kind = TypeKind.Object;
  // This includes both properties and methods. For example, `Array` will have
  // `length` and `pop` properties.
  properties: Map<string, Property>;
  /// A callable type can have multiple signatures if it has overloads. For
  /// example, fs.readFileSync returns a Buffer if no encoding is passed, but a
  /// string if an encoding is set.
  callSignatures: Signature[];
  constructor(properties: Property[], callSignatures: Signature[] = []) {
    super();
    this.properties = new Map();
    properties.forEach(prop => this.properties.set(prop.name, prop));
    this.callSignatures = callSignatures;
  }
  static newFunction(callSignatures: Signature[]) {
    assert(callSignatures.length != 0);
    return new ObjectType([], callSignatures);
  }
  isCallable(): boolean {
    return this.callSignatures.length != 0;
  }
}

// A type that has a proper name. We represent it by its fully-qualified name in
// order to avoid infinite loops. If you have a TypeScript class/interface type
// and you want to get at its proper type definition, pass it to
// `Converter.typeDefinition`, which will return an `ObjectType`.
//
// This is also used to represent instantiations of generic types.
export class NominativeType extends Type {
  kind = TypeKind.Nominative;
  // Human-readable name. This is not fully-qualified, so it's not guaranteed to
  // be unique.
  name: string;
  fullyQualifiedName: {
    // If this is true, the type is defined by the language itself and fileName
    // and packageName will be undefined.
    builtin: boolean;
    // Name of the package that defines the type. May be `@types/blah`.
    // undefined if the file is not inside a package (e.g., it's in the project
    // being analyzed).
    packageName: string | undefined;
    // Name of the file inside the package that defines the type, including its
    // extension. For files in other packages, this will usually end in `.d.ts`.
    fileName: string | undefined;
    name: string;
  };
  // If this is a generic type, these are the arguments passed to it, in order.
  typeArguments: Type[];
  constructor(
    name: string,
    fullyQualifiedName: {
      builtin?: boolean;
      fileName?: string;
      packageName?: string;
      name: string;
    },
    typeArguments: Type[] = []
  ) {
    super();
    this.name = name;
    this.fullyQualifiedName = {
      builtin: false,
      fileName: undefined,
      packageName: undefined,
      ...fullyQualifiedName
    };
    this.typeArguments = typeArguments;
  }
}

// A type parameter is a parameter such as K or V that shows up in the
// *definition* of a generic type.
export class TypeParameterType extends Type {
  kind = TypeKind.Parameter;
  name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }
}

// An anonymous type produced by TypeScript's `typeof` operator. This can
// commonly show up when looking at the types of class objects; `Date` has type
// `typeof Date`.
export class TypeofType extends Type {
  kind = TypeKind.Typeof;
  expression: string;
  constructor(expression: string) {
    super();
    this.expression = expression;
  }
}

// A tuple is an array whose values have different types. It's often used as the
// return type of iterators like Object.entries().
export class TupleType extends Type {
  kind = TypeKind.Tuple;
  typeArguments: Type[];
  constructor(typeArguments: Type[]) {
    super();
    this.typeArguments = typeArguments;
  }
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

export interface Parameter {
  name: string;
  type: Type;
}

export interface Signature {
  parameters: Parameter[];
  returnType: Type;
}

export const stringType = new PrimitiveType(TypeKind.String);
export const numberType = new PrimitiveType(TypeKind.Number);
export const booleanType = new PrimitiveType(TypeKind.Boolean);
export const nullType = new PrimitiveType(TypeKind.Null);
export const undefinedType = new PrimitiveType(TypeKind.Undefined);
export const voidType = new PrimitiveType(TypeKind.Void);
export const neverType = new PrimitiveType(TypeKind.Never);
export const anyType = new PrimitiveType(TypeKind.Any);
export const nonPrimitiveType = new NonPrimitiveType();
export const symbolType = new PrimitiveType(TypeKind.Symbol);
