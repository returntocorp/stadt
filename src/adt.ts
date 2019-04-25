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
  Intersection = "intersection",
  Untranslated = "untranslated",
  Literal = "literal",
  Object = "object",
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
}

// Non-object types that are built in to the JavaScript language (or to our type
// system).
export class PrimitiveType extends Type {
  kind: PrimitiveKind;
  constructor(kind: PrimitiveKind) {
    super();
    this.kind = kind;
  }
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

// The type of objects that aren't instances of a class or interface. This can
// also used to output the definitions of classes/interfaces.
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

export class NominativeType extends Type {
  kind = TypeKind.Nominative;
  // Human-readable name. This is not fully-qualified, so it's not guaranteed to
  // be unique.
  name: string;
  fullyQualifiedName: {
    builtin: boolean;
    fileName: string | undefined;
    packageName: string | undefined;
    name: string;
  };
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
// commonly show up when looking at the types of class objects; `Date` has
// typeof `typeof Date`.
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
  // Functions that don't return a value have void return type.
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
