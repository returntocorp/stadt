import { assert } from "chai";
import * as adt from "../src/adt";

// Tests for the type guard properties on the adt.Type class.
const p = adt.Type.prototype;

type Guard = (this: adt.Type) => boolean;

// All the type guard functions to check.
const guards: Guard[] = [
  p.isPrimitive,
  p.isString,
  p.isNumber,
  p.isBoolean,
  p.isNull,
  p.isUndefined,
  p.isVoid,
  p.isNever,
  p.isAny,
  p.isUnion,
  p.isSymbol,
  p.isUniqueSymbol,
  p.isIntersection,
  p.isUntranslated,
  p.isLiteral,
  p.isObject,
  p.isNonPrimitive,
  p.isNominative,
  p.isParameter,
  p.isTypeof,
  p.isTuple
];

describe("type guards", () => {
  // The format here is that the type is first, followed by all the guards that
  // it should satisfy. All other guards should be false.
  const types: [adt.Type, ((this: adt.Type) => boolean)[]][] = [
    // Primitives.
    [adt.stringType, [p.isString, p.isPrimitive]],
    [adt.numberType, [p.isNumber, p.isPrimitive]],
    [adt.booleanType, [p.isBoolean, p.isPrimitive]],
    [adt.nullType, [p.isNull, p.isPrimitive]],
    [adt.undefinedType, [p.isUndefined, p.isPrimitive]],
    [adt.voidType, [p.isVoid, p.isPrimitive]],
    [adt.neverType, [p.isNever, p.isPrimitive]],
    [adt.anyType, [p.isAny, p.isPrimitive]],
    [adt.symbolType, [p.isSymbol, p.isPrimitive]],
    [new adt.UniqueSymbolType("name"), [p.isUniqueSymbol, p.isPrimitive]],

    // Literals.
    [new adt.LiteralType("str"), [p.isString, p.isLiteral, p.isPrimitive]],
    [new adt.LiteralType(123), [p.isNumber, p.isLiteral, p.isPrimitive]],

    // Others.
    [new adt.TypeParameterType("T"), [p.isParameter]],
    [new adt.TypeofType("x.y"), [p.isTypeof]],
    [new adt.UntranslatedType("?!?!"), [p.isUntranslated]]
  ];

  for (const [ty, expectedGuards] of types) {
    it(`type guards for ${ty.toString()}`, () => {
      for (const guard of guards) {
        if (expectedGuards.includes(guard)) {
          assert(guard.call(ty), `${guard.name} should be true`);
        } else {
          assert(!guard.call(ty), `${guard.name} should be false`);
        }
      }
    });
  }
});
