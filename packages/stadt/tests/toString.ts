import { assert } from "chai";
import * as adt from "../src/adt";

describe("toString", () => {
  it("stringifies literal types as literals", () => {
    assert.equal(new adt.LiteralType(2).toString(), "2");
    assert.equal(new adt.LiteralType("foo").toString(), '"foo"');
  });

  describe("object types", () => {
    it("stringifies generic types using <> syntax", () => {
      const ty = new adt.NominativeType(
        "Map",
        {name: "Map"},
        [adt.stringType, adt.numberType]
      );
      assert.equal(ty.toString(), "Map<string, number>");
    });

    it("stringifies objects by listing their properties", () => {
      const ty = new adt.ObjectType([
        {name: "x", optional: false, type: adt.numberType},
        {name: "y", optional: false, type: adt.stringType}
      ]);
      assert.equal(ty.toString(), "{x: number; y: string}");
    });

    it("lists a single signature by itself", () => {
      const ty = adt.ObjectType.newFunction([
        {parameters: [{name: "x", type: adt.numberType}],
         returnType: adt.numberType}
      ]);
      assert.equal(ty.toString(), "(x: number) => number");
    });

    it("separates multiple signatures via semicolons", () => {
      const ty = adt.ObjectType.newFunction([
        {parameters: [{name: "x", type: adt.numberType}],
         returnType: adt.numberType},
        {parameters: [{name: "x", type: adt.stringType}],
         returnType: adt.stringType}
      ]);
      assert.equal(
        ty.toString(),
        "{(x: number) => number; (x: string) => string}"
      );
    });
  });

  it("stringifies union types by separating them with |", () => {
    const ty = new adt.UnionType([adt.numberType, adt.stringType]);
    assert.equal(ty.toString(), "number | string");
  });

  it("stringifies intersection types by separating them with &", () => {
    const ty = new adt.IntersectionType([adt.booleanType, adt.symbolType]);
    assert.equal(ty.toString(), "boolean & Symbol");
  });

  it("stringifies tuples using array-ish syntax", () => {
    const ty = new adt.TupleType([adt.numberType, adt.stringType]);
    assert.equal(ty.toString(), "[number, string]");
  });

  it("stringifies typeof types using the `typeof` keyword", () => {
    assert.equal(new adt.TypeofType("jQuery").toString(), "typeof jQuery");
  });
});
