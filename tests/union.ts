import { assert } from "chai";
import * as adt from "../src/adt";
import * as util from "./util";

describe("union types", () => {
  it("should convert union types", () => {
    const ty = util.parseAndGetType(
      "foo",
      `
const x = Math.random();
const foo = x < 0.5 ? String(x) : x;
`
    );
    assert.deepEqual(ty, new adt.UnionType([adt.stringType, adt.numberType]));
  });

  it("should convert intersection types", () => {
    const ty = util.parseAndGetType(
      "foo",
      `
const foo: {a: number} & {b: string} = {a: 3, b: 'hi'};
`
    );
    const expected = new adt.IntersectionType([
      new adt.ObjectType([
        { name: "a", type: adt.numberType, optional: false }
      ]),
      new adt.ObjectType([{ name: "b", type: adt.stringType, optional: false }])
    ]);
    assert.deepEqual(ty, expected);
  });

  it("stringifies union types by separating them with |", () => {
    const ty = new adt.UnionType([adt.numberType, adt.stringType]);
    assert.equal(ty.toString(), "number | string");
  });

  it("stringifies intersection types by separating them with &", () => {
    const ty = new adt.IntersectionType([adt.booleanType, adt.symbolType]);
    assert.equal(ty.toString(), "boolean & Symbol");
  });
});

describe("possibleTypes", () => {
  it("returns a list for non-union types", () => {
    const ty = new adt.LiteralType("foo");
    assert.sameMembers(ty.possibleTypes(), [ty]);
  });

  it("returns all the members of a union type", () => {
    const ty1 = new adt.LiteralType("foo");
    const ty2 = new adt.LiteralType(1234);
    const union = new adt.UnionType([ty1, ty2]);
    assert.sameMembers(union.possibleTypes(), [ty1, ty2]);
  });

  it("recurses into unions whose members are unions", () => {
    const ty1 = new adt.LiteralType("foo");
    const ty2 = new adt.LiteralType(1234);
    const innerUnion = new adt.UnionType([ty1, ty2]);
    const ty3 = adt.booleanType;
    const union = new adt.UnionType([innerUnion, ty3]);
    assert.sameMembers(union.possibleTypes(), [ty1, ty2, ty3]);
  });
});
